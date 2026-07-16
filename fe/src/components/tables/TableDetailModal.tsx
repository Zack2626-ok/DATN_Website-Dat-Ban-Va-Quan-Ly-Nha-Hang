import React from 'react';
import { Modal } from '../Modal';
import { Table } from '../../interfaces/table.interface';
import {
  DoorOpen,
  CalendarCheck,
  ClipboardList,
  ArrowRightLeft,
  Merge,
  Split,
  Receipt,
  XCircle,
  CheckCircle,
  Users,
  Clock,
} from 'lucide-react';

interface TableDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  onOpenTable: (table: Table) => void;
  onReserve?: (table: Table) => void;
  onViewOrder?: (table: Table) => void;
  onTransferTable?: (table: Table) => void;
  onMergeTable?: (table: Table) => void;
  onSplitTable?: (table: Table) => void;
  onViewInvoice?: (table: Table) => void;
  onCheckIn?: (table: Table) => void;
  onCancelReservation?: (table: Table) => void;
}

const TableDetailModal: React.FC<TableDetailModalProps> = ({
  isOpen,
  onClose,
  table,
  onOpenTable,
  onReserve,
  onViewOrder,
  onTransferTable,
  onMergeTable,
  onSplitTable,
  onViewInvoice,
  onCheckIn,
  onCancelReservation,
}) => {
  if (!table) return null;

  const getStatusConfig = (status: Table['status']) => {
    switch (status) {
      case 'empty':
        return {
          label: 'Trống',
          color: 'text-emerald-400',
          bgDot: 'bg-emerald-400',
          bgBadge: 'bg-emerald-500/10 border-emerald-500/20',
          icon: '🟢',
        };
      case 'reserved':
        return {
          label: 'Đã đặt trước',
          color: 'text-sky-700',
          bgDot: 'bg-amber-400',
          bgBadge: 'bg-sky-50 border-sky-100',
          icon: '🟡',
        };
      case 'serving':
        return {
          label: 'Đang phục vụ',
          color: 'text-blue-400',
          bgDot: 'bg-blue-400',
          bgBadge: 'bg-blue-500/10 border-blue-500/20',
          icon: '🔵',
        };
      case 'pending_payment':
        return {
          label: 'Chờ thanh toán',
          color: 'text-purple-400',
          bgDot: 'bg-purple-400',
          bgBadge: 'bg-purple-500/10 border-purple-500/20',
          icon: '🟣',
        };
      default:
        return {
          label: 'Không xác định',
          color: 'text-gray-400',
          bgDot: 'bg-gray-400',
          bgBadge: 'bg-sky-50/500/10 border-gray-500/20',
          icon: '⚪',
        };
    }
  };

  const statusConfig = getStatusConfig(table.status);

  const ActionButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  }> = ({ icon, label, onClick, variant = 'secondary' }) => {
    const variantStyles = {
      primary:
        'bg-admin-primary/90 hover:bg-admin-primary text-white border-admin-primary/30 shadow-lg shadow-admin-primary/20',
      secondary:
        'bg-white/5 hover:bg-sky-100 text-zinc-200 border-slate-200 hover:border-white/20',
      danger:
        'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 hover:border-rose-500/30',
      warning:
        'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-100 hover:border-sky-200',
    };

    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.98] ${variantStyles[variant]}`}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="font-semibold text-sm">{label}</span>
      </button>
    );
  };

  const renderActions = () => {
    switch (table.status) {
      case 'empty':
        return (
          <div className="space-y-2">
            <ActionButton
              icon={<DoorOpen size={18} />}
              label="Mở bàn"
              onClick={() => {
                onClose();
                onOpenTable(table);
              }}
              variant="primary"
            />
            <ActionButton
              icon={<CalendarCheck size={18} />}
              label="Đặt trước"
              onClick={() => onReserve?.(table)}
              variant="secondary"
            />
          </div>
        );
      case 'reserved':
        return (
          <div className="space-y-2">
            <ActionButton
              icon={<CheckCircle size={18} />}
              label="Check-in (Nhận bàn)"
              onClick={() => onCheckIn?.(table)}
              variant="primary"
            />
            <ActionButton
              icon={<XCircle size={18} />}
              label="Hủy đặt"
              onClick={() => onCancelReservation?.(table)}
              variant="danger"
            />
          </div>
        );
      case 'serving':
        return (
          <div className="space-y-2">
            <ActionButton
              icon={<ClipboardList size={18} />}
              label="Xem order"
              onClick={() => onViewOrder?.(table)}
              variant="primary"
            />
            <ActionButton
              icon={<ArrowRightLeft size={18} />}
              label="Chuyển bàn"
              onClick={() => onTransferTable?.(table)}
            />
            <ActionButton
              icon={<Merge size={18} />}
              label="Gộp bàn"
              onClick={() => onMergeTable?.(table)}
            />
            <ActionButton
              icon={<Split size={18} />}
              label="Tách bàn"
              onClick={() => onSplitTable?.(table)}
            />
          </div>
        );
      case 'pending_payment':
        return (
          <div className="space-y-2">
            <ActionButton
              icon={<Receipt size={18} />}
              label="Xem hóa đơn"
              onClick={() => onViewInvoice?.(table)}
              variant="primary"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bàn ${table.name}`} size="sm">
      <div className="space-y-6">
        {/* Table Info */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-slate-200 flex items-center justify-center">
            <span className="text-3xl font-black text-zinc-100 font-display">{table.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border ${statusConfig.bgBadge} ${statusConfig.color}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusConfig.bgDot} ${table.status === 'empty' ? 'animate-pulse' : ''}`} />
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400 text-sm">
            <div className="flex items-center gap-1.5">
              <Users size={14} />
              <span>Sức chứa: <strong className="text-zinc-200">{table.capacity}</strong> khách</span>
            </div>
            {table.currentOrder && (
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>Order #{table.currentOrder.id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Action Buttons */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Thao tác
          </p>
          {renderActions()}
        </div>
      </div>
    </Modal>
  );
};

export default TableDetailModal;
