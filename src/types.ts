export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  completed_at: string | null;
}
