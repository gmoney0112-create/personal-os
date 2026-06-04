import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
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

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

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

const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

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
  const { title, priority = 'medium' } = req.body as { title?: string; priority?: string };
  if (!title?.trim()) {
    res.status(400).json({ message: 'title is required' });
    return;
  }
  if (!VALID_PRIORITIES.has(priority)) {
    res.status(400).json({ message: 'priority must be low, medium, or high' });
    return;
  }
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
  const { status, priority } = req.body as { status?: string; priority?: string };
  const updates: Record<string, string> = {};
  if (status) updates.status = status;
  if (priority) {
    if (!VALID_PRIORITIES.has(priority)) {
      res.status(400).json({ message: 'priority must be low, medium, or high' });
      return;
    }
    updates.priority = priority;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ message: 'No valid fields to update' });
    return;
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

app.post('/api/ai/command', aiLimiter, requireAuth, async (req: Request, res: Response) => {
  const { message, tasks = [] } = req.body as { message?: string; tasks?: TaskRow[] };
  if (!message?.trim()) {
    res.status(400).json({ message: 'message is required' });
    return;
  }

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

        if (name === 'create_task' && inp.title && inp.priority) {
          const { data, error } = await supabaseAdmin
            .from('tasks')
            .insert([{ user_id: req.user.id, title: inp.title.trim(), priority: inp.priority, status: 'todo' }])
            .select();
          if (!error) actions.push({ type: 'created', task: (data as TaskRow[])[0] });
        } else if (name === 'update_task' && inp.taskId) {
          const { data: existing } = await supabaseAdmin.from('tasks').select('user_id').eq('id', inp.taskId).single();
          if ((existing as { user_id: string } | null)?.user_id === req.user.id) {
            const updates: Record<string, string> = {};
            if (inp.status) updates.status = inp.status;
            if (inp.priority) updates.priority = inp.priority;
            const { data } = await supabaseAdmin.from('tasks').update(updates).eq('id', inp.taskId).select();
            if (data?.[0]) actions.push({ type: 'updated', task: (data as TaskRow[])[0] });
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

app.listen(PORT, () => {
  console.log(`Imperial Backend running on port ${PORT}`);
});
