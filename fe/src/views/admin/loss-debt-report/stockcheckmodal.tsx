import React, { useState, useEffect, useMemo } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { X, Save } from "lucide-react";

interface CheckRow {
  id: number;
  name: string;
  unit: string;
  system_stock: number;
  actual_today: number | null;
  last_checked: string | null;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const StockCheckModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [actuals, setActuals] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoading(true);
        const res = await api.get("/v1/inventory/stock-check/today");
        if (res.data.success) {
          const list: CheckRow[] = res.data.data;
          setRows(list);
          // Prefill: nếu hôm nay đã kiểm rồi thì lấy actual_today, chưa thì để trống
          const init: Record<number, string> = {};
          list.forEach((r) => {
            init[r.id] = r.actual_today !== null ? String(r.actual_today) : "";
          });
          setActuals(init);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách kiểm kê:", error);
        toast.error("Không thể tải danh sách kiểm kê.");
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, []);

  const getVarianceColor = (pct: number) => {
    if (pct === 0) return "text-emerald-600";
    if (pct <= 2) return "text-amber-600";
    if (pct <= 5) return "text-orange-600";
    return "text-rose-700 font-bold";
  };

  const computed = useMemo(() => {
    return rows.map((row) => {
      const raw = actuals[row.id];
      const hasValue = raw !== undefined && raw !== "";
      const actualVal = hasValue ? Number(raw) : null;
      const variance = actualVal !== null ? actualVal - row.system_stock : null;
      const pct =
        variance !== null && row.system_stock > 0
          ? (Math.abs(variance) / row.system_stock) * 100
          : 0;
      return { ...row, actualVal, variance, pct, hasValue };
    });
  }, [rows, actuals]);

  const handleChange = (id: number, value: string) => {
    setActuals((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    const records = computed
      .filter((r) => r.hasValue)
      .map((r) => ({ ingredient_id: r.id, actual_stock: r.actualVal }));

    if (records.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 nguyên liệu");
      return;
    }

    setSaving(true);
    try {
      await api.post("/v1/inventory/stock-check", { records });
      toast.success("Lưu kiểm kê thành công!");
      onSuccess();
    } catch (error) {
      console.error("Lỗi lưu kiểm kê:", error);
      toast.error("Lưu kiểm kê thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-sky-100 px-6 py-4">
          <h3 className="font-playfair text-lg font-bold text-sky-800">Kiểm kê kho hôm nay</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-10 text-center text-slate-400">Đang tải danh sách...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">Nguyên liệu</th>
                  <th className="py-2 text-right">Lý thuyết</th>
                  <th className="py-2 text-right">Thực tế</th>
                  <th className="py-2 text-right">Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {computed.map((row) => (
                  <tr key={row.id} className="border-t border-sky-50">
                    <td className="py-2.5">
                      <span className="font-medium text-slate-700">{row.name}</span>
                      <span className="ml-1 text-xs text-slate-400">({row.unit})</span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">
                      {row.system_stock}
                    </td>
                    <td className="py-2.5 text-right">
                      <input
                        type="number"
                        value={actuals[row.id] ?? ""}
                        onChange={(e) => handleChange(row.id, e.target.value)}
                        placeholder="Nhập số"
                        className="w-24 rounded-lg border border-sky-200 px-2 py-1 text-right text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </td>
                    <td className={`py-2.5 text-right tabular-nums ${row.hasValue ? getVarianceColor(row.pct) : "text-slate-300"}`}>
                      {row.hasValue ? `${row.variance! > 0 ? "+" : ""}${row.variance} (${row.pct.toFixed(1)}%)` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-sky-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-sky-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Đang lưu..." : "Lưu kiểm kê"}
          </button>
        </div>
      </div>
    </div>
  );
};