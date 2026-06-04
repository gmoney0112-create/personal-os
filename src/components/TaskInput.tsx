import { useState } from 'react';
import type { TaskPriority } from '../types';

interface Props {
  onAdd: (title: string, priority: TaskPriority) => void;
}

export default function TaskInput({ onAdd }: Props) {
  const [value, setValue] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd(value.trim(), priority);
    setValue('');
    setPriority('medium');
  };

  return (
    <div className="flex gap-4 mb-8">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="Add a new imperial directive..."
        className="flex-1 bg-[#141414] border border-gray-800 p-4 rounded-lg text-white focus:border-yellow-500 outline-none transition-all"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as TaskPriority)}
        className="bg-[#141414] border border-gray-800 px-3 rounded-lg text-gray-400 text-xs uppercase tracking-widest focus:border-yellow-500 outline-none"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button
        onClick={handleAdd}
        className="px-8 py-4 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all"
      >
        EXECUTE
      </button>
    </div>
  );
}
