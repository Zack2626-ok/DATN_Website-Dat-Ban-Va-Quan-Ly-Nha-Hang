import React from "react";
import { Modal } from "../../../../components/Modal";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  loading?: boolean;
}

/**
 * ConfirmDeleteModal - Modal xác nhận xóa người dùng (soft delete)
 */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận xóa"
      theme="light"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-full">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700">Xóa người dùng</h3>
            <p className="text-sm text-slate-400">
              Bạn có chắc muốn xóa <span className="font-semibold text-slate-600">{userName}</span>?
              Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-sky-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-sky-200 text-slate-600 rounded-lg hover:bg-sky-50/50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Xóa
          </button>
        </div>
      </div>
    </Modal>
  );
};
