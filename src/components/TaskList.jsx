import TaskCard from './TaskCard';

export default function TaskList({ tasks, loading, error, onDelete, onUpdate }) {
  if (loading) return <p className="text-gray-500 text-center py-8">Loading directives...</p>;
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
