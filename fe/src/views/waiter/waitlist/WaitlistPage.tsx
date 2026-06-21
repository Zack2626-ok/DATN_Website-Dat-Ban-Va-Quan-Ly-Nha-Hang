import React, { useState, useMemo } from "react";
import { MOCK_WAITLIST, WaitlistCustomer } from "../../waitlist/mockData";
import { WaitlistTable } from "../../waitlist/components/WaitlistTable";
import { AddCustomerModal } from "../../waitlist/components/AddCustomerModal";
import { Users, Star, Clock, Plus } from "lucide-react";

/**
 * Danh sách chờ — Waitlist cho nhân viên phục vụ
 */
export const WaitlistPage: React.FC = () => {
  const [customers, setCustomers] = useState<WaitlistCustomer[]>(MOCK_WAITLIST);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = useMemo(() => {
    const total = customers.filter((c) => c.status !== "seated" && c.status !== "cancelled").length;
    const waiting = customers.filter((c) => c.status === "waiting").length;
    return { total, waiting };
  }, [customers]);

  const handleNotify = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "notified" } : c)),
    );
  };

  const handleAdd = (name: string, phone: string, partySize: number) => {
    const newCustomer: WaitlistCustomer = {
      id: Date.now().toString(),
      name,
      phone,
      partySize,
      joinedAt: new Date().toISOString(),
      status: "waiting",
    };
    setCustomers((prev) => [...prev, newCustomer]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Danh sách chờ</h1>
          <p className="text-sm text-gray-600">Theo dõi khách hàng đang chờ tại nhà hàng</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Thêm khách hàng
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Tổng khách chờ", value: stats.total, icon: Users, color: "text-gray-900" },
          { label: "Cần thông báo", value: stats.waiting, icon: Star, color: "text-blue-600" },
          { label: "Thời gian chờ TB", value: "15 phút", icon: Clock, color: "text-gray-900" },
        ].map((stat, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{stat.label}</p>
              <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <WaitlistTable customers={customers} onNotify={handleNotify} />
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
};
