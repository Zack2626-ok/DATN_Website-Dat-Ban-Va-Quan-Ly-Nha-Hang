import React from 'react';
import { TableArea } from '../../interfaces/table.interface';

interface AreaSelectorProps {
  areas: TableArea[];
  selectedAreaId: number | null;
  onSelectArea: (id: number | null) => void;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ areas, selectedAreaId, onSelectArea }) => {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        onClick={() => onSelectArea(null)}
        className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${selectedAreaId === null
            ? 'bg-blue-700 text-white'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
      >
        Tất cả
      </button>
      {areas.map((area) => (
        <button
          key={area.id}
          onClick={() => onSelectArea(area.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${selectedAreaId === area.id
              ? 'bg-blue-700 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          {area.name}
        </button>
      ))}
    </div>
  );
};

export default AreaSelector;
