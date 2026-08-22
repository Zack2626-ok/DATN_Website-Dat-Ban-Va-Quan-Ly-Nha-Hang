import React, { useCallback, useState } from "react";
import { AlertCircle, DoorOpen, Phone, Users, Utensils } from "lucide-react";
import { toast } from "react-hot-toast";
import { Modal } from "../Modal";

const MIN_WALK_IN_GUESTS = 1;
const MAX_WALK_IN_GUESTS = 30;
const DEFAULT_WALK_IN_GUESTS = 2;
const VIETNAM_PHONE_PATTERN = /^(03|09)\d{8}$/;

export interface OpenTableFormData {
  guestCount: number;
  customerName: string;
  customerPhone: string;
}

interface OpenTableSnapshot {
  name: string;
  area_name?: string | null;
  capacity: number;
}

interface OpenTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: OpenTableFormData) => void | Promise<void>;
  table: OpenTableSnapshot | null;
  initialData?: OpenTableFormData | null;
}

/**
 * Collects the minimum information required to open a physical walk-in table.
 * Booking conflicts are validated by the server immediately before the order is created.
 */
export const OpenTableModal: React.FC<OpenTableModalProps> = ({ isOpen, onClose, onConfirm, table, initialData }) => {
  const [guestCount, setGuestCount] = useState(DEFAULT_WALK_IN_GUESTS);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setGuestCount(initialData.guestCount || DEFAULT_WALK_IN_GUESTS);
        setCustomerName(initialData.customerName || "");
        setCustomerPhone(initialData.customerPhone || "");
      } else {
        setGuestCount(DEFAULT_WALK_IN_GUESTS);
        setCustomerName("");
        setCustomerPhone("");
      }
    }
  }, [isOpen, initialData]);

  /** Restores the form to its initial state for the next walk-in party. */
  const resetForm = useCallback((): void => {
    setGuestCount(DEFAULT_WALK_IN_GUESTS);
    setCustomerName("");
    setCustomerPhone("");
    setIsSubmitting(false);
  }, []);

  /** Closes the dialog without retaining unfinished walk-in information. */
  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  /** Validates the form locally, then delegates authoritative opening to the parent service flow. */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng.");
      return;
    }

    const normalizedPhone = customerPhone.trim().replace(/[\s-]/g, "");
    if (normalizedPhone && !VIETNAM_PHONE_PATTERN.test(normalizedPhone)) {
      toast.error("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03 hoặc 09).");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        guestCount,
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!table) return null;

  const exceedsCapacity = guestCount > table.capacity;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Mở bàn ${table.name}`} size="md" theme="light">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Utensils size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-black text-slate-800">{table.name}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Khu vực: {table.area_name || "Chưa phân khu"} · Sức chứa: {table.capacity} khách
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700" htmlFor="walk-in-guest-count">
            <Users size={16} className="text-sky-600" />
            Số lượng khách <span className="text-rose-500">*</span>
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuestCount((value) => Math.max(MIN_WALK_IN_GUESTS, value - 1))}
              disabled={guestCount <= MIN_WALK_IN_GUESTS}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Giảm số khách"
            >
              −
            </button>
            <input
              id="walk-in-guest-count"
              type="number"
              min={MIN_WALK_IN_GUESTS}
              max={MAX_WALK_IN_GUESTS}
              value={guestCount}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                setGuestCount(Math.min(MAX_WALK_IN_GUESTS, Math.max(MIN_WALK_IN_GUESTS, nextValue)));
              }}
              className="h-11 w-24 rounded-xl border border-slate-200 bg-white text-center text-lg font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="button"
              onClick={() => setGuestCount((value) => Math.min(MAX_WALK_IN_GUESTS, value + 1))}
              disabled={guestCount >= MAX_WALK_IN_GUESTS}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Tăng số khách"
            >
              +
            </button>
          </div>
        </section>

        {exceedsCapacity && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              Số khách vượt sức chứa chuẩn ({guestCount}/{table.capacity} khách).
            </p>
            <p className="mt-1 text-xs">
              Mở bàn thành công nhưng hệ thống sẽ <strong>khóa gọi món</strong>. Bạn bắt buộc phải <strong>Chuyển bàn</strong> hoặc <strong>Gộp bàn</strong> để mở rộng sức chứa mới có thể gọi món.
            </p>
          </div>
        )}

        <section className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-bold text-slate-700" htmlFor="walk-in-customer-name">
              Tên khách hàng <span className="text-rose-500">*</span>
            </label>
            <input
              id="walk-in-customer-name"
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Nhập tên khách hàng"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700" htmlFor="walk-in-customer-phone">
              <Phone size={15} className="text-sky-600" />
              Số điện thoại <span className="font-normal text-slate-400">(không bắt buộc)</span>
            </label>
            <input
              id="walk-in-customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value.replace(/[^0-9+]/g, "").replace(/(?!^\+)\+/g, ""))}
              placeholder="Ví dụ: 0901234567"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </section>

        <div className="flex gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-admin-primary py-3 text-sm font-black text-white shadow-lg shadow-admin-primary/20 transition hover:bg-admin-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <span>Đang xử lý...</span> : <><DoorOpen size={17} /> Xác nhận mở bàn</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default OpenTableModal;
