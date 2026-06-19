import React from 'react';
import { Table } from '../../interfaces/table.interface';

interface TableCardProps {
  table: Table;
  onClick: (table: Table) => void;
}

const TableCard: React.FC<TableCardProps> = ({ table, onClick }) => {
  const getStatusClasses = (status: Table['status']) => {
    switch (status) {
      case 'empty':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'reserved':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'serving':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending_payment':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: Table['status']) => {
    switch (status) {
      case 'empty':
        return 'Trống';
      case 'reserved':
        return 'Đặt trước';
      case 'serving':
        return 'Đang dùng';
      case 'pending_payment':
        return 'Chờ thanh toán';
      default:
        return 'Không xác định';
    }
  };

  return (
    <div
      onClick={() => onClick(table)}
      className={`cursor-pointer p-4 rounded-lg border-2 transition-all hover:shadow-md flex flex-col items-center justify-center min-h-[120px] ${getStatusClasses(
        table.status
      )}`}
    >
      <span className="text-xl font-bold">{table.name}</span>
      <span className="text-sm opacity-80">{table.capacity} chỗ</span>
      <div className="mt-2 text-xs font-semibold uppercase tracking-wider">
        {getStatusLabel(table.status)}
      </div>
    </div>
  );
};

export default TableCard;
