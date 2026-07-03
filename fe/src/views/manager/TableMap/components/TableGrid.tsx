import React, { useMemo } from "react";
import { TableCard } from "./TableCard";
import type { ResmanagerTable } from "../../../../services/tableService";

interface TableGridProps {
  tables: ResmanagerTable[];
  onAction: (action: string, table: ResmanagerTable) => void;
}

export const TableGrid: React.FC<TableGridProps> = ({ tables, onAction }) => {
  // Tính toán kích thước lưới động dựa trên dữ liệu bàn thực tế trong DB
  const { maxCol, maxRow, occupiedCells } = useMemo(() => {
    let maxC = 3; // Mặc định tối thiểu 3 cột
    let maxR = 3; // Mặc định tối thiểu 3 hàng
    const occupied = new Set<string>();

    tables.forEach((t) => {
      const colIdx = Number(t.col_pos);
      const rowIdx = t.row_pos.charCodeAt(0) - 64; // 'A' -> 1, 'B' -> 2...

      if (colIdx > maxC) maxC = colIdx;
      if (rowIdx > maxR) maxR = rowIdx;
      
      occupied.add(`${rowIdx}-${colIdx}`);
    });

    return { maxCol: maxC, maxRow: maxR, occupiedCells: occupied };
  }, [tables]);

  // Tạo danh sách các ô trống để render ô nét đứt
  const emptyPlaceholders = useMemo(() => {
    const placeholders: { row: number; col: number }[] = [];
    for (let r = 1; r <= maxRow; r++) {
      for (let c = 1; c <= maxCol; c++) {
        if (!occupiedCells.has(`${r}-${c}`)) {
          placeholders.push({ row: r, col: c });
        }
      }
    }
    return placeholders;
  }, [maxCol, maxRow, occupiedCells]);

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
        <p className="font-semibold">Không có bàn ăn nào trong khu vực này.</p>
        <p className="text-xs text-gray-400 mt-1">Vui lòng thêm bàn mới hoặc cập nhật sơ đồ.</p>
      </div>
    );
  }

  // Tiêu đề cột (1, 2, 3...)
  const colHeaders = Array.from({ length: maxCol }, (_, i) => i + 1);
  // Tiêu đề hàng (A, B, C...)
  const rowHeaders = Array.from({ length: maxRow }, (_, i) => String.fromCharCode(65 + i));

  return (
    <div className="overflow-x-auto w-full pb-4">
      {/* Container CSS Grid chính */}
      <div
        className="grid gap-6 p-4 min-w-[700px]"
        style={{
          gridTemplateColumns: `80px repeat(${maxCol}, minmax(130px, 1fr))`,
          gridTemplateRows: `40px repeat(${maxRow}, minmax(100px, auto))`,
        }}
      >
        {/* Góc trên bên trái: Trục Toạ Độ */}
        <div className="flex items-center justify-center text-[10px] font-black text-gray-300 uppercase tracking-wider select-none border-r border-b border-dashed border-gray-100">
          Dãy \ Cột
        </div>

        {/* Render Tiêu đề Cột (Trục X) */}
        {colHeaders.map((col) => (
          <div
            key={`col-header-${col}`}
            style={{ gridRowStart: 1, gridColumnStart: col + 1 }}
            className="flex items-center justify-center text-xs font-black text-gray-400 select-none border-b border-dashed border-gray-100 pb-1"
          >
            Cột {col}
          </div>
        ))}

        {/* Render Tiêu đề Hàng (Trục Y) */}
        {rowHeaders.map((rowChar, idx) => (
          <div
            key={`row-header-${rowChar}`}
            style={{ gridRowStart: idx + 2, gridColumnStart: 1 }}
            className="flex items-center justify-center text-sm font-black text-gray-400 select-none border-r border-dashed border-gray-100 pr-2 font-display"
          >
            Dãy {rowChar}
          </div>
        ))}

        {/* Render Các Bàn Thực Tế */}
        {tables.map((table) => {
          const rIndex = table.row_pos.charCodeAt(0) - 64;
          return (
            <div
              key={table.id}
              style={{
                gridRowStart: rIndex + 1, // dịch 1 hàng vì hàng 1 là tiêu đề cột
                gridColumnStart: table.col_pos + 1, // dịch 1 cột vì cột 1 là tiêu đề hàng
              }}
              className="animate-fade-in"
            >
              <TableCard table={table} onAction={onAction} />
            </div>
          );
        })}

        {/* Render Các Ô Trống Bố Trí Không Gian (Dashed Outline Placeholders) */}
        {emptyPlaceholders.map(({ row, col }) => (
          <div
            key={`empty-${row}-${col}`}
            style={{
              gridRowStart: row + 1,
              gridColumnStart: col + 1,
            }}
            className="border border-dashed border-gray-100 bg-gray-50/20 rounded-xl flex items-center justify-center min-h-[96px] text-gray-300/40 select-none text-[10px] font-medium"
          >
            Vị trí trống ({String.fromCharCode(64 + row)}-{col})
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableGrid;
