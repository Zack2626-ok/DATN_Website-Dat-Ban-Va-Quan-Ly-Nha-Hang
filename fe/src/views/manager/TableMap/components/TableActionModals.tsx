import React, { useState, useEffect } from "react";
import { X, ArrowRight, Link2, Copy, Play } from "lucide-react";
import toast from "react-hot-toast";
import type { ResmanagerTable } from "../../../../services/tableService";

// Interface chung cho Modal Props
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: ResmanagerTable | null;
}

// ============================================================================
// 1. OPEN TABLE MODAL (MỞ BÀN MỚI)
// ============================================================================
interface OpenTableModalProps extends BaseModalProps {
  onConfirm: (data: { guestCount: number; customerName: string; customerPhone: string }) => void;
  loading?: boolean;
}

export const OpenTableModal: React.FC<OpenTableModalProps> = ({ isOpen, onClose, table, onConfirm, loading = false }) => {
  const [guestCount, setGuestCount] = useState<number>(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGuestCount(table?.capacity || 2);
      setCustomerName("");
      setCustomerPhone("");
    }
  }, [isOpen, table]);

  if (!isOpen || !table) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerPhone.trim()) {
      const cleanedPhone = customerPhone.trim().replace(/[\s-]/g, '');
      const phoneRegex = /^(03|09)\d{8}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        toast.error("Số điện thoại không hợp lệ (bắt buộc 10 chữ số, bắt đầu bằng 03 hoặc 09)");
        return;
      }
    }
    onConfirm({
      guestCount,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Play size={16} className="text-[#FF5A5F]" />
            Mở bàn mới: {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Số lượng khách *</label>
            <input
              type="number"
              min={1}
              required
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Sức chứa tối đa của bàn: {table.capacity} người</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tên khách hàng (Tùy chọn)</label>
            <input
              type="text"
              placeholder="Ví dụ: Anh Hào"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Số điện thoại (Tùy chọn)</label>
            <input
              type="tel"
              placeholder="Ví dụ: 0969775850"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer"
            >
              {loading ? "Đang xử lý..." : "Mở bàn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. TRANSFER TABLE MODAL (CHUYỂN BÀN)
// ============================================================================
interface TransferTableModalProps extends BaseModalProps {
  emptyTables: ResmanagerTable[];
  onConfirm: (targetTableId: number) => void;
  loading?: boolean;
}

export const TransferTableModal: React.FC<TransferTableModalProps> = ({
  isOpen,
  onClose,
  table,
  emptyTables,
  onConfirm,
  loading = false,
}) => {
  const [targetTableId, setTargetTableId] = useState<number | "">("");

  useEffect(() => {
    if (isOpen) {
      setTargetTableId("");
    }
  }, [isOpen]);

  if (!isOpen || !table) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) return;
    onConfirm(Number(targetTableId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            Chuyển bàn: {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 flex items-center gap-4">
            <div className="font-bold">Bàn nguồn: {table.name}</div>
            <ArrowRight size={14} className="text-blue-500" />
            <div className="font-bold">Bàn đích: Chọn bàn trống bên dưới</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chọn bàn trống cần chuyển đến *</label>
            <select
              required
              value={targetTableId}
              onChange={(e) => setTargetTableId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none bg-white"
            >
              <option value="">-- Chọn bàn trống --</option>
              {emptyTables
                .filter((t) => t.id !== table.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Sức chứa: {t.capacity} người - {t.area_name})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !targetTableId}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Chuyển hóa đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MERGE TABLE MODAL (GỘP BÀN)
// ============================================================================
interface MergeTableModalProps extends BaseModalProps {
  emptyTables: ResmanagerTable[];
  onConfirm: (mergedTableIds: number[]) => void;
  loading?: boolean;
}

export const MergeTableModal: React.FC<MergeTableModalProps> = ({
  isOpen,
  onClose,
  table,
  emptyTables,
  onConfirm,
  loading = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
    }
  }, [isOpen]);

  if (!isOpen || !table) return null;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    onConfirm(selectedIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Link2 size={16} className="text-[#FF5A5F]" />
            Gộp bàn vào {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Chọn các bàn trống cần gộp chung hóa đơn với bàn **{table.name}**. Khi gộp, các bàn con sẽ chia sẻ hóa đơn và trạng thái với bàn mẹ.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chọn các bàn gộp (Chọn nhiều)</label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1">
              {emptyTables
                .filter((t) => t.id !== table.id)
                .map((t) => {
                  const isChecked = selectedIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        isChecked ? "bg-purple-50 text-purple-900" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(t.id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {t.capacity} người - {t.area_name}
                      </span>
                    </label>
                  );
                })}

              {emptyTables.length === 0 && (
                <div className="p-4 text-center text-xs text-gray-400 font-medium">
                  Không tìm thấy bàn trống nào khác.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || selectedIds.length === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : `Gộp ${selectedIds.length} bàn`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 4. SPLIT TABLE MODAL (TÁCH BÀN)
// ============================================================================
interface SplitTableModalProps extends BaseModalProps {
  emptyTables: ResmanagerTable[];
  onConfirm: (data: { targetTableId: number; childLabel: string }) => void;
  loading?: boolean;
}

export const SplitTableModal: React.FC<SplitTableModalProps> = ({
  isOpen,
  onClose,
  table,
  emptyTables,
  onConfirm,
  loading = false,
}) => {
  const [targetTableId, setTargetTableId] = useState<number | "">("");
  const [childLabel, setChildLabel] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTargetTableId("");
      setChildLabel("");
    }
  }, [isOpen]);

  if (!isOpen || !table) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId || !childLabel.trim()) return;
    onConfirm({
      targetTableId: Number(targetTableId),
      childLabel: childLabel.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Copy size={16} className="text-[#FF5A5F]" />
            Tách bàn: {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Chọn một bàn trống để tách một phần đơn hàng từ bàn **{table.name}** sang.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tên nhãn tách hóa đơn *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Bàn A, Nhóm 2..."
              value={childLabel}
              onChange={(e) => setChildLabel(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chọn bàn trống nhận chuyển sang *</label>
            <select
              required
              value={targetTableId}
              onChange={(e) => setTargetTableId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none bg-white"
            >
              <option value="">-- Chọn bàn trống --</option>
              {emptyTables
                .filter((t) => t.id !== table.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Sức chứa: {t.capacity} người - {t.area_name})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !targetTableId || !childLabel.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Tách bàn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 5. TABLE FORM MODAL (THÊM / SỬA BÀN ĂN)
// ============================================================================
interface TableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: ResmanagerTable | null; // null => Thêm mới, có giá trị => Chỉnh sửa
  areas: { id: number; name: string }[];
  existingTables: ResmanagerTable[];
  onConfirm: (data: { area_id: number; name: string; capacity: number; row_pos: string; col_pos: number }) => void;
  loading?: boolean;
}

export const TableFormModal: React.FC<TableFormModalProps> = ({
  isOpen,
  onClose,
  table,
  areas,
  existingTables,
  onConfirm,
  loading = false,
}) => {
  const [areaId, setAreaId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<number>(4);
  const [rowPos, setRowPos] = useState("A");
  const [colPos, setColPos] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [duplicateTable, setDuplicateTable] = useState<ResmanagerTable | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setDuplicateTable(null);
      if (table) {
        // Chế độ Edit
        setAreaId(table.area_id);
        setName(table.name);
        setCapacity(table.capacity);
        setRowPos(table.row_pos);
        setColPos(table.col_pos);
      } else {
        // Chế độ Create
        setAreaId(areas.length > 0 ? areas[0].id : "");
        setName("");
        setCapacity(4);
        setRowPos("A");
        setColPos(1);
      }
    }
  }, [isOpen, table, areas]);

  // Kiểm tra trùng lặp tọa độ thời gian thực
  useEffect(() => {
    const trimmedRow = rowPos.trim().toUpperCase();
    if (!areaId || !trimmedRow || !colPos) {
      setDuplicateTable(null);
      return;
    }

    const duplicate = existingTables.find(
      (t) =>
        t.area_id === Number(areaId) &&
        t.row_pos.toUpperCase() === trimmedRow &&
        Number(t.col_pos) === Number(colPos) &&
        (!table || t.id !== table.id)
    );

    setDuplicateTable(duplicate || null);
  }, [areaId, rowPos, colPos, existingTables, table]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedName = name.trim();
    const trimmedRow = rowPos.trim().toUpperCase();

    if (!areaId) {
      setErrorMsg("Vui lòng chọn Khu vực bàn.");
      return;
    }
    if (!trimmedName) {
      setErrorMsg("Vui lòng nhập Tên bàn.");
      return;
    }
    if (capacity < 1 || capacity > 20) {
      setErrorMsg("Sức chứa phải nằm trong khoảng từ 1 đến 20 khách.");
      return;
    }
    if (trimmedRow.length !== 1 || !/[A-Z]/.test(trimmedRow)) {
      setErrorMsg("Dãy vị trí phải là 1 chữ cái in hoa từ A đến Z.");
      return;
    }
    if (colPos < 1 || colPos > 12) {
      setErrorMsg("Cột vị trí phải nằm trong khoảng từ 1 đến 12.");
      return;
    }
    if (duplicateTable) {
      setErrorMsg(`Vị trí tọa độ (${trimmedRow}-${colPos}) đã được đăng ký bởi bàn ${duplicateTable.name}.`);
      return;
    }

    onConfirm({
      area_id: Number(areaId),
      name: trimmedName,
      capacity: Number(capacity),
      row_pos: trimmedRow,
      col_pos: Number(colPos),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">
            {table ? `Sửa thông tin bàn: ${table.name}` : "Thêm bàn ăn mới"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Khu vực *</label>
            <select
              required
              value={areaId}
              onChange={(e) => setAreaId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none bg-white"
            >
              <option value="">-- Chọn khu vực --</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tên bàn *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: B01, VIP-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Sức chứa (Khách) *</label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Hàng/Dãy (A-Z) *</label>
              <input
                type="text"
                maxLength={1}
                required
                placeholder="A"
                value={rowPos}
                onChange={(e) => setRowPos(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Cột hiển thị (1-12) *</label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={colPos}
                onChange={(e) => setColPos(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none text-center font-bold"
              />
            </div>
          </div>

          {duplicateTable && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 font-medium">
              ⚠️ Tọa độ ({rowPos.toUpperCase()}-{colPos}) đã được sử dụng bởi bàn <strong>{duplicateTable.name}</strong>. Lưu lại sẽ gây đè tọa độ!
            </div>
          )}

          <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2.5 leading-relaxed">
            * <strong>Hàng và Cột</strong> quyết định vị trí chính xác của bàn trên lưới sơ đồ vật lý. Đảm bảo bố trí hợp lý tránh trùng tọa độ.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !!duplicateTable}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang lưu..." : "Lưu lại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 6. CONFIRM DELETE TABLE MODAL (XÁC NHẬN XÓA BÀN - XÓA MỀM)
// ============================================================================
interface ConfirmDeleteTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: ResmanagerTable | null;
  onConfirm: () => void;
  loading?: boolean;
}

export const ConfirmDeleteTableModal: React.FC<ConfirmDeleteTableModalProps> = ({
  isOpen,
  onClose,
  table,
  onConfirm,
  loading = false,
}) => {
  if (!isOpen || !table) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Xác nhận xóa bàn ăn</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-600 leading-relaxed">
            Bạn có chắc chắn muốn xóa bàn ăn <strong className="text-gray-900">{table.name}</strong> không? Hành động này sẽ thực hiện ẩn bàn ăn ra khỏi sơ đồ lưới nhưng lưu trữ thông tin lịch sử.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-xs cursor-pointer"
            >
              {loading ? "Đang xóa..." : "Đồng ý xóa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 7. OPEN TAB MODAL (MỞ TAB KHÁCH MANG VỀ / QUẦY BAR)
// ============================================================================
interface OpenTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { guest_name: string; guest_phone: string; note: string }) => void;
  loading?: boolean;
}

export const OpenTabModal: React.FC<OpenTabModalProps> = ({ isOpen, onClose, onConfirm, loading = false }) => {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGuestName("");
      setGuestPhone("");
      setNote("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    if (guestPhone.trim()) {
      const cleanedPhone = guestPhone.trim().replace(/[\s-]/g, '');
      const phoneRegex = /^(03|09)\d{8}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        toast.error("Số điện thoại không hợp lệ (bắt buộc 10 chữ số, bắt đầu bằng 03 hoặc 09)");
        return;
      }
    }

    onConfirm({
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim(),
      note: note.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">
            📇 Mở Tab nhanh (Takeaway / Quầy Bar)
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tên khách hàng / Nhãn Tab *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Khách mang về A, Khách quầy Bar 2"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Số điện thoại khách (Tùy chọn)</label>
            <input
              type="tel"
              placeholder="Nhập số điện thoại khách hàng"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, ''))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Ghi chú đơn hàng (Tùy chọn)</label>
            <textarea
              placeholder="Ví dụ: Đồ uống mang về, ít đá..."
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none resize-none"
            />
          </div>

          <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2.5 leading-relaxed">
            * Tab sau khi tạo sẽ nằm trong danh sách đơn hàng đang chạy của Thu ngân để tiện xuất hóa đơn và pha chế, không hiển thị trên sơ đồ bàn vật lý.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !guestName.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Mở Tab"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
