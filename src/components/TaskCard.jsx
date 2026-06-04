const PRIORITY_BORDER = { high: 'border-red-500', medium: 'border-yellow-600', low: 'border-gray-600' };
const STATUS_CYCLE = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' };
const PRIORITY_CYCLE = { low: 'medium', medium: 'high', high: 'low' };

export default function TaskCard({ task, onDelete, onUpdate }) {
  const border = PRIORITY_BORDER[task.priority] ?? PRIORITY_BORDER.medium;

  return (
    <div className={`p-4 bg-[#141414] border-l-4 ${border} rounded-r-lg flex justify-between items-center hover:bg-[#1a1a1a] transition-all group`}>
      <span className="text-lg flex-1">{task.title}</span>
      <div className="flex items-center gap-2">
        {task.priority && (
          <button
            onClick={() => onUpdate(task.id, { priority: PRIORITY_CYCLE[task.priority] ?? 'medium' })}
            className="text-xs uppercase text-gray-600 px-2 py-1 hover:text-yellow-500 transition-all"
            title="Click to cycle priority"
          >
            {task.priority}
          </button>
        )}
        <button
          onClick={() => onUpdate(task.id, { status: STATUS_CYCLE[task.status] ?? 'todo' })}
          className="text-xs uppercase text-gray-500 px-2 py-1 bg-black rounded border border-gray-800 hover:border-yellow-600 transition-all"
        >
          {task.status}
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all px-1"
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
