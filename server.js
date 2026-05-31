import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Service role client — never expose this key client-side
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Anon client used only to verify inbound JWTs
const supabaseAuth = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const { data: { user }, error } = await supabaseAuth.auth.getUser(header.slice(7));
  if (error || !user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  req.user = user;
  next();
}

const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'Imperial Engine Online', timestamp: new Date().toISOString() });
});

app.get('/api/tasks/:userId', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetch tasks:', error.message);
    return res.status(500).json({ message: 'Failed to fetch tasks' });
  }
  res.json(data);
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  const { title, priority = 'medium' } = req.body;
  if (!title?.trim()) {
    return res.status(400).json({ message: 'title is required' });
  }
  if (!VALID_PRIORITIES.has(priority)) {
    return res.status(400).json({ message: 'priority must be low, medium, or high' });
  }
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert([{ user_id: req.user.id, title: title.trim(), priority, status: 'todo' }])
    .select();
  if (error) {
    console.error('create task:', error.message);
    return res.status(500).json({ message: 'Failed to create task' });
  }
  res.status(201).json(data[0]);
});

app.delete('/api/tasks/:taskId', requireAuth, async (req, res) => {
  // Verify ownership before deleting
  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('user_id')
    .eq('id', req.params.taskId)
    .single();
  if (fetchError || !task) return res.status(404).json({ message: 'Task not found' });
  if (task.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', req.params.taskId);
  if (error) {
    console.error('delete task:', error.message);
    return res.status(500).json({ message: 'Failed to delete task' });
  }
  res.status(204).send();
});

app.patch('/api/tasks/:taskId', requireAuth, async (req, res) => {
  const { status, priority } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (priority) {
    if (!VALID_PRIORITIES.has(priority)) {
      return res.status(400).json({ message: 'priority must be low, medium, or high' });
    }
    updates.priority = priority;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('user_id')
    .eq('id', req.params.taskId)
    .single();
  if (fetchError || !task) return res.status(404).json({ message: 'Task not found' });
  if (task.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', req.params.taskId)
    .select();
  if (error) {
    console.error('update task:', error.message);
    return res.status(500).json({ message: 'Failed to update task' });
  }
  res.json(data[0]);
});

export { app };

app.listen(PORT, () => {
  console.log(`Imperial Backend running on port ${PORT}`);
});
