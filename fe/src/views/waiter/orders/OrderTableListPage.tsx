import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Utensils, ArrowRight } from "lucide-react";
import { getTablesV1 } from "../../../services/tableService";
import { Badge } from "../../../components/Badge";

/**
 * Danh sách bàn đang phục vụ — chọn bàn để gọi món
 */
export const OrderTableListPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTables, setActiveTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTablesV1()
      .then((tables) => {
        const filtered = tables.filter(
          (t) => t.status === "serving" || t.status === "pending_payment",
        );
        setActiveTables(filtered);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Đang tải danh sách bàn...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Gọi món</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chọn bàn đang phục vụ để gọi món, hold hoặc gửi bếp
        </p>
      </div>

      {activeTables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Utensils size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="font-bold text-gray-600">Chưa có bàn đang phục vụ</p>
          <p className="text-sm text-gray-400 mt-1">Mở bàn từ Sơ đồ bàn trước khi gọi món</p>
          <button
            onClick={() => navigate("/waiter/tables")}
            className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700"
          >
            Đến Sơ đồ bàn
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTables.map((table) => (
            <button
              key={table.id}
              onClick={() => navigate(`/waiter/orders/${table.id}`)}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Utensils size={22} />
                </div>
                <div>
                  <p className="font-black text-lg text-gray-900">{table.name}</p>
                  <p className="text-xs text-gray-500">{table.capacity} chỗ</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={table.status} type="table" />
                <ArrowRight
                  size={18}
                  className="text-gray-300 group-hover:text-blue-600 transition-colors"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
