import React, { useEffect, useState, useMemo } from "react";
import QRCode from "react-qr-code";
import { Printer } from "lucide-react";
import { getTableAreas, getTables } from "../../../services/tableService";
import type { TableArea, ResmanagerTable } from "../../../types/table.types";

/**
 * QRCodeSettings - Màn hình thiết lập và in QR Code cho từng bàn
 */
export const QRCodeSettings: React.FC = () => {
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [tables, setTables] = useState<ResmanagerTable[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [areasRes, tablesRes] = await Promise.all([
        getTableAreas(),
        getTables(),
      ]);
      setAreas(areasRes);
      setTables(tablesRes);
      if (areasRes.length > 0) {
        setActiveTab(areasRes[0].id);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu bàn:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filter tables by active area
  const filteredTables = useMemo(() => {
    if (!activeTab) return [];
    return tables.filter((t) => t.area_id === activeTab);
  }, [tables, activeTab]);

  const handlePrintAll = () => {
    window.print();
  };

  const handlePrintSingle = (tableId: number) => {
    // Để in 1 mã duy nhất, chúng ta có thể dùng CSS class.
    // Tạm thời ở mức cơ bản, in toàn bộ trang hoặc sử dụng logic ẩn các phần tử không cần thiết.
    // Vì yêu cầu là giao diện tĩnh in ấn, ta mở print dialog.
    window.print();
  };

  const getTableQRUrl = (table: ResmanagerTable) => {
    // Sinh URL QR Code (Lấy theo domain hiện tại của web)
    const baseUrl = window.location.origin; 
    const token = btoa(`table_${table.id}_static_auth`);
    return `${baseUrl}/client/order?table_id=${table.id}&token=${token}`;
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-[#8B8B8B] font-medium">Đang tải cấu hình QR Code...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#F8F9FA]">
      {/* HEADER (Ẩn khi in) */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 print:hidden">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Thiết lập QR Code</h1>
        <button
          onClick={handlePrintAll}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Printer size={16} />
          In tất cả
        </button>
      </header>

      {/* TABS (Ẩn khi in) */}
      <div className="border-b border-gray-200 bg-white px-6 py-2 print:hidden">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setActiveTab(area.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === area.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* QR CODE GRID (Nội dung chính hiển thị & in) */}
      <main className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA] print:p-0 print:bg-white print:overflow-visible">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center print:hidden">
            <p className="text-gray-500">Không có bàn nào trong khu vực này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 print:grid-cols-4 print:gap-4">
            {filteredTables.map((table) => (
              <div
                key={table.id}
                className="flex flex-col items-center justify-center rounded-xl bg-white p-4 shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 print:break-inside-avoid"
              >
                <div className="mb-2 text-center">
                  <h3 className="text-sm font-bold text-gray-800 uppercase">
                    Bàn {table.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    (Quét mã để gọi món)
                  </p>
                </div>
                
                <div className="mb-4 bg-white p-2 border-2 border-gray-100 rounded-lg">
                  <QRCode
                    value={getTableQRUrl(table)}
                    size={120}
                    level="Q"
                    className="w-full h-auto max-w-[120px]"
                  />
                </div>

                {/* Print button (Ẩn khi in) */}
                <button
                  onClick={() => handlePrintSingle(table.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors print:hidden cursor-pointer"
                  title="In mã QR này"
                >
                  <Printer size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Khối Style in ấn CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          main, main * {
            visibility: visible;
          }
          main {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
          }
        }
      `}} />
    </div>
  );
};
