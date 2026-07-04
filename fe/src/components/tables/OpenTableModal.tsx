import React, { useState, useCallback } from 'react';
import { Modal } from '../Modal';
import { Utensils, AlertCircle, DoorOpen } from 'lucide-react';
import { Table } from '../../interfaces/table.interface';
import { GuestCounter } from './GuestCounter';
import { CustomerForm } from './CustomerForm';

export interface OpenTableFormData {
  guestCount: number;
  customerName: string;
  customerPhone: string;
}

interface OpenTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: OpenTableFormData) => void;
  table: Table | null;
}

export const OpenTableModal: React.FC<OpenTableModalProps> = ({ isOpen, onClose, onConfirm, table }) => {
  const [guestCount, setGuestCount] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const resetForm = useCallback(() => {
    setGuestCount(2);
    setCustomerName('');
    setCustomerPhone('');
    setIsSubmitting(false);
    setShowSuccess(false);
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      import('react-hot-toast').then(m => m.toast.error('Vui lòng nhập tên khách hàng'));
      return;
    }
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);

      onConfirm({ guestCount, customerName, customerPhone });

      setTimeout(() => {
        handleClose();
      }, 2000);
    }, 800);
  };

  if (!table) return null;

  if (showSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={`Mở bàn ${table.name}`} size="md">
        <div className="flex flex-col items-center justify-center py-10 space-y-5 animate-fade-in">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
            <Utensils size={36} className="text-emerald-400" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-emerald-400 font-display">Mở bàn thành công!</h3>
            <p className="text-zinc-400 text-sm">
              Bàn <strong className="text-zinc-200">{table.name}</strong> đã được mở cho{' '}
              <strong className="text-zinc-200">{guestCount}</strong> khách
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Mở bàn ${table.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="w-14 h-14 rounded-xl bg-admin-primary/10 border border-admin-primary/20 flex items-center justify-center flex-shrink-0">
            <Utensils size={24} className="text-admin-primary" />
          </div>
          <div>
            <p className="font-bold text-zinc-100 text-lg font-display">{table.name}</p>
            <p className="text-zinc-500 text-sm">
              Khu vực: {table.area_name || '—'} · Sức chứa: {table.capacity} khách
            </p>
          </div>
        </div>

        <GuestCounter 
          value={guestCount} 
          min={1} 
          max={table.capacity} 
          onChange={setGuestCount} 
        />
        
        {guestCount > table.capacity && (
          <p className="text-xs text-rose-400 flex items-center gap-1">
            <AlertCircle size={12} />
            Vượt quá sức chứa tối đa ({table.capacity} khách)
          </p>
        )}

        <div className="border-t border-white/5" />

        <CustomerForm 
          name={customerName} 
          phone={customerPhone} 
          onNameChange={setCustomerName} 
          onPhoneChange={setCustomerPhone} 
        />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-zinc-400 font-bold hover:bg-white/10 hover:text-zinc-200 transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting || guestCount < 1}
            className="flex-[2] py-3 rounded-xl bg-admin-primary text-white font-black shadow-lg shadow-admin-primary/20 hover:bg-admin-primary-hover transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <DoorOpen size={18} />
                Xác nhận mở bàn
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default OpenTableModal;
