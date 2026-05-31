import { useState } from 'react';

export default function TaskInput({ onAdd }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
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
      <button
        onClick={handleAdd}
        className="px-8 py-4 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all"
      >
        EXECUTE
      </button>
    </div>
  );
}
