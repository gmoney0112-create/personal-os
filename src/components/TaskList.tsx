import type { Task } from '../types';
import TaskCard from './TaskCard';

interface Props {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Task, 'status' | 'priority'>>) => void;
}

function SkeletonCard() {
  return (
    <div className="p-4 bg-[#141414] border-l-4 border-yellow-900 rounded-r-lg flex justify-between items-center animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-2/3" />
      <div className="flex items-center gap-2">
        <div className="h-4 bg-gray-800 rounded w-12" />
        <div className="h-6 bg-gray-800 rounded w-16" />
      </div>
    </div>
  );
}

export default function TaskList({ tasks, loading, error, onDelete, onUpdate }: Props) {
  if (loading) return (
    <div className="grid grid-cols-1 gap-4">
      {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
  );
  if (error) return <p className="text-red-500 text-center py-8">Error: {error}</p>;
  if (tasks.length === 0) return <p className="text-gray-600 text-center py-8">No directives yet. Issue a command.</p>;

  return (
    <div className="grid grid-cols-1 gap-4">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onDelete={onDelete} onUpdate={onUpdate} />
      ))}
    </div>
  );
}
