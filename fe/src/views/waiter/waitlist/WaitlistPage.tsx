import React, { useState, useEffect, useMemo } from "react";
import { WaitlistTable } from "../../waitlist/components/WaitlistTable";
import { AddCustomerModal } from "../../waitlist/components/AddCustomerModal";
import { Users, Star, Clock, Plus } from "lucide-react";
import { getWaitlist, addToWaitlist, notifyWaitlistGuest } from "../../../services/waitlistService";
import { toast } from "react-hot-toast";

/**
 * Danh sách chờ — Waitlist cho nhân viên phục vụ
 */
export const WaitlistPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWaitlist = async () => {
    try {
      const data = await getWaitlist();
      // Chuyển format từ DB sang format của UI
      const formatted = data.map((d) => ({
        id: d.id.toString(),
        name: d.guest_name,
        phone: d.phone || "",
        partySize: d.party_size,
        joinedAt: d.joined_at,
        status: d.notified_at ? "notified" : "waiting",
      }));
      setCustomers(formatted);
    } catch (err) {
      toast.error("Lỗi khi tải danh sách chờ");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const stats = useMemo(() => {
    const total = customers.filter((c) => c.status !== "seated" && c.status !== "cancelled").length;
    const waiting = customers.filter((c) => c.status === "waiting").length;
    return { total, waiting };
  }, [customers]);

  const handleNotify = async (id: string) => {
    try {
      await notifyWaitlistGuest(Number(id));
      toast.success("Đã thông báo cho khách hàng!");
      fetchWaitlist();
    } catch (err) {
      toast.error("Lỗi khi thông báo");
      console.error(err);
    }
  };

  const handleAdd = async (name: string, phone: string, partySize: number) => {
    try {
      await addToWaitlist({
        guest_name: name,
        phone,
        party_size: partySize,
      });
      toast.success("Đã thêm vào danh sách chờ!");
      setIsModalOpen(false);
      fetchWaitlist();
    } catch (err) {
      toast.error("Lỗi thêm khách hàng");
      console.error(err);
    }
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
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Đang tải danh sách chờ...</div>
        ) : (
          <WaitlistTable customers={customers} onNotify={handleNotify} />
        )}
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
};
