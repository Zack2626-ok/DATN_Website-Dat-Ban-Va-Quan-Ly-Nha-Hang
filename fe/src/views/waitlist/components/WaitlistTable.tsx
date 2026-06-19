import React from 'react';
import { WaitlistCustomer } from '../mockData';
import { WaitlistStatusBadge } from './WaitlistStatusBadge';

interface WaitlistTableProps {
  customers: WaitlistCustomer[];
  onNotify: (id: string) => void;
}

export const WaitlistTable: React.FC<WaitlistTableProps> = ({ customers, onNotify }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-admin-border">
          <tr>
            <th className="px-6 py-4 text-[11px] font-bold text-admin-text-sub uppercase tracking-wider w-[25%]">Khách Hàng</th>
            <th className="px-6 py-4 text-[11px] font-bold text-admin-text-sub uppercase tracking-wider w-[20%]">Số Điện Thoại</th>
            <th className="px-6 py-4 text-[11px] font-bold text-admin-text-sub uppercase tracking-wider w-[15%] text-center">Số Người</th>
            <th className="px-6 py-4 text-[11px] font-bold text-admin-text-sub uppercase tracking-wider w-[20%]">Trạng Thái</th>
            <th className="px-6 py-4 text-[11px] font-bold text-admin-text-sub uppercase tracking-wider text-center w-[20%]">Hành Động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-border">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-admin-primary-light/30 transition-colors">
              <td className="px-6 py-4 font-semibold text-admin-text-main">{customer.name}</td>
              <td className="px-6 py-4 text-sm text-admin-text-sub">{customer.phone}</td>
              <td className="px-6 py-4 font-semibold text-admin-text-main text-center">{customer.partySize}</td>
              <td className="px-6 py-4">
                <WaitlistStatusBadge status={customer.status} />
              </td>
              <td className="px-6 py-4 text-center">
                {customer.status === 'waiting' && (
                  <button
                    onClick={() => onNotify(customer.id)}
                    className="px-4 py-2 bg-admin-primary-light text-admin-primary rounded-lg font-bold text-[11px] hover:bg-admin-primary hover:text-white transition-all shadow-sm"
                  >
                    THÔNG BÁO
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
