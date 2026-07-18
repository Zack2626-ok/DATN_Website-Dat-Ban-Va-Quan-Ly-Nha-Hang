import React from 'react';
import { Table } from '../../interfaces/table.interface';
import TableCard from './TableCard';

interface TableMapProps {
  tables: Table[];
  onTableClick: (table: Table) => void;
}

const TableMap: React.FC<TableMapProps> = ({ tables, onTableClick }) => {
  // Nhóm các bàn theo hàng (row_pos)
  const rows = tables.reduce((acc, table) => {
    if (!acc[table.row_pos]) {
      acc[table.row_pos] = [];
    }
    acc[table.row_pos].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  // Sắp xếp các hàng theo bảng chữ cái và các cột theo số
  const sortedRowKeys = Object.keys(rows).sort();
  
  return (
    <div className="flex flex-col gap-8">
      {sortedRowKeys.map((rowKey) => (
        <div key={rowKey} className="flex flex-wrap gap-4">
          <div className="w-8 flex items-center justify-center font-bold text-gray-400">
            {rowKey}
          </div>
          <div className="flex flex-wrap gap-4 flex-1">
            {rows[rowKey]
              .sort((a, b) => a.col_pos - b.col_pos)
              .map((table) => (
                <div key={table.id} className="w-[150px]">
                  <TableCard table={table} onClick={onTableClick} />
                </div>
              ))}
          </div>
        </div>
      ))}
      
      {tables.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <p>Không có bàn nào trong khu vực này.</p>
        </div>
      )}
    </div>
  );
};

export default TableMap;
