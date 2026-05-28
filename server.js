import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Imperial Engine Online', timestamp: new Date().toISOString() });
});

app.get('/api/tasks/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json(error);
  res.json(data);
});

app.post('/api/tasks', async (req, res) => {
  const { user_id, title, priority = 'medium' } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ user_id, title, priority, status: 'todo' }])
    .select();
  
  if (error) return res.status(500).json(error);
  res.json(data[0]);
});

app.listen(PORT, () => {
  console.log(`🚀 Imperial Backend running on port ${PORT}`);
});
