import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

const app = express();
const PORT = process.env.PORT ?? 3001;

// H-3: Fail fast — no silent localhost fallback in production
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;
if (!rawAllowedOrigins && process.env.NODE_ENV === 'production') {
  console.error('FATAL: ALLOWED_ORIGINS env var is required in production');
  process.exit(1);
}
const ALLOWED_ORIGINS = rawAllowedOrigins?.split(',') ?? ['http://localhost:5173'];
app.use(cors({ origin: ALLOWED_ORIGINS }));
// M-3: HTTP security headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());
// Prevent oversized request bodies
app.use(express.json({ limit: '64kb' }));

// M-2: Redis-backed rate limiter that survives Vercel cold starts.
// Falls back silently to in-memory express-rate-limit when Upstash is not configured (local dev).
const upstashAiRateLimit = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(20, '15 m'),
    prefix: 'personal-os:ai',
  });
})();

async function upstashAiLimit(req: Request, res: Response, next: NextFunction) {
  if (!upstashAiRateLimit) { next(); return; }
  try {
    const { success } = await upstashAiRateLimit.limit(req.user.id);
    if (!success) {
      res.status(429).json({ message: 'AI command limit reached, please wait before trying again.' });
      return;
    }
  } catch { /* fail open — express-rate-limit below still guards */ }
  next();
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI command limit reached, please wait before trying again.' },
});

app.use('/api', apiLimiter);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAuth = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const Priority = z.enum(['low', 'medium', 'high']);
const Status = z.enum(['todo', 'in-progress', 'done']);

// M-1: Added .max(500) to title to prevent oversized DB writes / prompt flooding
const CreateTaskSchema = z.object({
  title: z.string().min(1, 'title is required').max(500, 'title must be 500 characters or fewer').trim(),
  priority: Priority.default('medium'),
});

const UpdateTaskSchema = z.object({
  status: Status.optional(),
  priority: Priority.optional(),
}).refine(d => d.status !== undefined || d.priority !== undefined, {
  message: 'No valid fields to update',
});

// C-1: Removed `tasks` from the client schema — the server fetches tasks itself
// to eliminate the prompt injection attack surface.
const AICommandSchema = z.object({
  message: z.string().min(1, 'message is required').max(2000, 'message must be 2000 characters or fewer'),
});

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task for the user',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['title', 'priority'],
    },
  },
  {
    name: 'update_task',
    description: 'Update the status or priority of an existing task',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task by ID',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
      },
      required: ['taskId'],
    },
  },
];

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  const { data: { user }, error } = await supabaseAuth.auth.getUser(header.slice(7));
  if (error || !user) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }
  req.user = user;
  next();
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'Imperial Engine Online', timestamp: new Date().toISOString() });
});

app.get('/api/tasks/:userId', requireAuth, async (req: Request, res: Response) => {
  if (req.user.id !== req.params.userId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetch tasks:', error.message);
    res.status(500).json({ message: 'Failed to fetch tasks' });
    return;
  }
  res.json(data);
});

app.post('/api/tasks', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }
  const { title, priority } = parsed.data;
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert([{ user_id: req.user.id, title: title.trim(), priority, status: 'todo' }])
    .select();
  if (error) {
    console.error('create task:', error.message);
    res.status(500).json({ message: 'Failed to create task' });
    return;
  }
  res.status(201).json((data as Record<string, unknown>[])[0]);
});

app.delete('/api/tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('user_id')
    .eq('id', req.params.taskId)
    .single();
  if (fetchError || !task) { res.status(404).json({ message: 'Task not found' }); return; }
  if ((task as { user_id: string }).user_id !== req.user.id) { res.status(403).json({ message: 'Forbidden' }); return; }

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', req.params.taskId);
  if (error) {
    console.error('delete task:', error.message);
    res.status(500).json({ message: 'Failed to delete task' });
    return;
  }
  res.status(204).send();
});

app.patch('/api/tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }
  const updates: Record<string, string | null> = { ...parsed.data };
  if (parsed.data.status === 'done') {
    updates.completed_at = new Date().toISOString();
  } else if (parsed.data.status !== undefined) {
    updates.completed_at = null;
  }

  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('user_id')
    .eq('id', req.params.taskId)
    .single();
  if (fetchError || !task) { res.status(404).json({ message: 'Task not found' }); return; }
  if ((task as { user_id: string }).user_id !== req.user.id) { res.status(403).json({ message: 'Forbidden' }); return; }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', req.params.taskId)
    .select();
  if (error) {
    console.error('update task:', error.message);
    res.status(500).json({ message: 'Failed to update task' });
    return;
  }
  res.json((data as Record<string, unknown>[])[0]);
});

interface TaskRow { id: string; title: string; priority: string; status: string; user_id: string }
interface AIToolInput { title?: string; priority?: string; taskId?: string; status?: string }
interface AIAction { type: 'created' | 'updated' | 'deleted'; task?: TaskRow; taskId?: string }

app.post('/api/ai/command', aiLimiter, requireAuth, upstashAiLimit, async (req: Request, res: Response) => {
  const parsed = AICommandSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }
  const { message } = parsed.data;

  // C-1: Fetch tasks server-side using the verified user identity.
  // This eliminates the prompt injection vector that existed when the client
  // supplied task content directly into the system prompt.
  const { data: userTasks, error: tasksError } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, status')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (tasksError) {
    console.error('AI command — task fetch:', tasksError.message);
    res.status(500).json({ message: 'Failed to load tasks for AI context' });
    return;
  }

  const tasks = (userTasks as TaskRow[]) ?? [];
  const taskList = tasks.length
    ? tasks.map(t => `- [${t.id}] "${t.title}" | priority: ${t.priority} | status: ${t.status}`).join('\n')
    : 'No tasks yet.';

  const systemPrompt = `You are an AI command interface for "Personal OS — Imperial Command Center", a personal productivity dashboard.
Help the user manage their tasks using natural language. Use tools to create, update, or delete tasks when asked.
For questions or advice (e.g. "what should I focus on?"), respond concisely without using tools.
Keep responses brief and fitting the Imperial theme.

Current tasks (${tasks.length}):
${taskList}`;

  try {
    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      tools: AI_TOOLS,
      messages: [{ role: 'user', content: message }],
    });

    const actions: AIAction[] = [];
    let text = '';

    for (const block of aiResponse.content) {
      if (block.type === 'text') {
        text = block.text;
      } else if (block.type === 'tool_use') {
        const { name, input } = block;
        const inp = input as AIToolInput;

        if (name === 'create_task') {
          // C-2: Validate AI-supplied tool inputs through the same schema as the REST endpoint
          const createParsed = CreateTaskSchema.safeParse({ title: inp.title, priority: inp.priority });
          if (createParsed.success) {
            const { data, error } = await supabaseAdmin
              .from('tasks')
              .insert([{ user_id: req.user.id, title: createParsed.data.title, priority: createParsed.data.priority, status: 'todo' }])
              .select();
            if (!error) actions.push({ type: 'created', task: (data as TaskRow[])[0] });
          }
        } else if (name === 'update_task' && inp.taskId) {
          // C-2: Validate AI-supplied update fields through the same schema as the REST endpoint
          const updateParsed = UpdateTaskSchema.safeParse({ status: inp.status, priority: inp.priority });
          if (updateParsed.success) {
            const { data: existing } = await supabaseAdmin.from('tasks').select('user_id').eq('id', inp.taskId).single();
            if ((existing as { user_id: string } | null)?.user_id === req.user.id) {
              const updates: Record<string, string | null> = { ...updateParsed.data };
              // H-1: Keep completed_at consistent with the REST PATCH handler
              if (updateParsed.data.status === 'done') {
                updates.completed_at = new Date().toISOString();
              } else if (updateParsed.data.status !== undefined) {
                updates.completed_at = null;
              }
              const { data } = await supabaseAdmin.from('tasks').update(updates).eq('id', inp.taskId).select();
              if (data?.[0]) actions.push({ type: 'updated', task: (data as TaskRow[])[0] });
            }
          }
        } else if (name === 'delete_task' && inp.taskId) {
          const { data: existing } = await supabaseAdmin.from('tasks').select('user_id').eq('id', inp.taskId).single();
          if ((existing as { user_id: string } | null)?.user_id === req.user.id) {
            await supabaseAdmin.from('tasks').delete().eq('id', inp.taskId);
            actions.push({ type: 'deleted', taskId: inp.taskId });
          }
        }
      }
    }

    if (!text && actions.length > 0) {
      text = actions.map(a => {
        if (a.type === 'created') return `Created "${a.task?.title}" (${a.task?.priority} priority).`;
        if (a.type === 'updated') return `Updated "${a.task?.title}".`;
        if (a.type === 'deleted') return 'Task deleted.';
        return '';
      }).join(' ');
    }

    res.json({ response: text, actions });
  } catch (err) {
    console.error('AI command error:', (err as Error).message);
    res.status(500).json({ message: 'AI command failed' });
  }
});

export { app };

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Imperial Backend running on port ${PORT}`);
  });
}
