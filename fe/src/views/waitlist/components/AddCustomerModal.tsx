import React, { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { User, Phone, Users, Plus, Loader2 } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, phone: string, partySize: number) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    onAdd(name, phone, partySize);
    setIsSubmitting(false);
    onClose();
    setName('');
    setPhone('');
    setPartySize(2);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300">
      <Modal isOpen={isOpen} onClose={onClose} title="Thêm khách hàng mới" size="md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Thông tin khách hàng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Họ và tên</label>
                <div className="relative group">
                  <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    required 
                    placeholder="Nguyễn Văn A" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all duration-200" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Số điện thoại</label>
                <div className="relative group">
                  <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    required 
                    placeholder="090 123 4567" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all duration-200" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Thông tin lượt chờ</h3>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Số lượng người</label>
              <div className="relative group">
                <Users size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={partySize} 
                  onChange={e => setPartySize(Number(e.target.value))} 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all duration-200" 
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isSubmitting ? 'Đang thêm...' : 'Thêm khách hàng'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
