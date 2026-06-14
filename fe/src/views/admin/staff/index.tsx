import React, { useState } from "react";
import { UserPlus, Clock, Award, Search } from "lucide-react";

type StaffRole = "Admin" | "Quản lý" | "Phục vụ" | "Bếp" | "Thu ngân";

interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  shift: string;
  status: "in" | "out";
  clockInTime?: string;
  username?: string;
  password?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: "Gold" | "Silver" | "Bronze" | "VIP" | "Standard";
  lastVisit: string;
}

const INITIAL_STAFF: StaffMember[] = [
  { id: "s1", name: "Nguyễn Văn Admin", role: "Admin", shift: "Cả ngày", status: "in", clockInTime: "08:00", username: "admin", password: "123" + "456" },
  { id: "s2", name: "Trần Văn Manager", role: "Quản lý", shift: "Cả ngày", status: "in", clockInTime: "08:00", username: "manager", password: "123" + "456" },
  { id: "s3", name: "Lê Thị Cashier", role: "Thu ngân", shift: "Cả ngày", status: "in", clockInTime: "08:30", username: "cashier", password: "123" + "456" },
  { id: "s4", name: "Hoàng Văn Waiter 1", role: "Phục vụ", shift: "Sáng (6h-14h)", status: "in", clockInTime: "06:30", username: "waiter1", password: "123" + "456" },
  { id: "s5", name: "Phạm Thị Waiter 2", role: "Phục vụ", shift: "Tối (14h-22h)", status: "out", username: "waiter2", password: "123" + "456" },
  { id: "s6", name: "Võ Văn Chef", role: "Bếp", shift: "Tối (14h-22h)", status: "out", username: "chef", password: "123" + "456" },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Lê Minh Tuấn", phone: "0901234567", points: 1250, tier: "Gold", lastVisit: "2026-06-11" },
  { id: "c2", name: "Nguyễn Thị Hương", phone: "0987654321", points: 840, tier: "Silver", lastVisit: "2026-06-10" },
  { id: "c3", name: "Phan Văn Khánh", phone: "0911223344", points: 3200, tier: "VIP", lastVisit: "2026-06-12" },
  { id: "c4", name: "Trần Minh Đức", phone: "0933445566", points: 150, tier: "Bronze", lastVisit: "2026-06-08" },
  { id: "c5", name: "Phạm Hồng Nhung", phone: "0955667788", points: 620, tier: "Silver", lastVisit: "2026-06-05" },
];

export const StaffManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"staff" | "customers">("staff");
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [customers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState("");

  const roleColors: Record<StaffRole, string> = {
    "Admin": "bg-rose-50 text-rose-700 border-rose-200",
    "Quản lý": "bg-purple-50 text-purple-700 border-purple-200",
    "Phục vụ": "bg-blue-50 text-blue-700 border-blue-200",
    "Bếp": "bg-orange-50 text-orange-700 border-orange-200",
    "Thu ngân": "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const tierColors = {
    VIP: "bg-purple-900 text-purple-100 border-purple-700",
    Gold: "bg-amber-50 text-amber-700 border-amber-200",
    Silver: "bg-slate-100 text-slate-700 border-slate-300",
    Bronze: "bg-orange-150 text-orange-850 border-orange-300",
    Standard: "bg-slate-50 text-slate-500 border-slate-200",
  };

  const filteredStaff = staff.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleToggleAttendance = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const clockingIn = s.status === "out";
          return {
            ...s,
            status: clockingIn ? "in" : "out",
            clockInTime: clockingIn ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          };
        }
        return s;
      })
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-800">
      
      {/* Title Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black font-display text-slate-900">Quản lý Nhân sự & Khách hàng</h3>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý nhân viên, chấm công và chương trình khách hàng thân thiết
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "staff" ? (
            <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-display flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <UserPlus size={14} /> Thêm nhân viên mới
            </button>
          ) : (
            <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-display flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <UserPlus size={14} /> Thêm khách hàng mới
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveTab("staff");
              setSearchQuery("");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-display transition-all cursor-pointer ${
              activeTab === "staff"
                ? "bg-white text-slate-800 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Nhân viên
          </button>
          <button
            onClick={() => {
              setActiveTab("customers");
              setSearchQuery("");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-display transition-all cursor-pointer ${
              activeTab === "customers"
                ? "bg-white text-slate-800 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Khách hàng
          </button>
        </div>

        {/* Search tool */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder={activeTab === "staff" ? "Tìm nhân viên..." : "Tìm khách hàng..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 text-slate-850 font-medium"
          />
        </div>
      </div>

      {/* Data grids */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {activeTab === "staff" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Tên nhân viên</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Ca làm việc</th>
                  <th className="p-4">Trạng thái chấm công</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      <div>{member.name}</div>
                      {member.username && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          tài khoản: {member.username} | mật khẩu: {member.password}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${roleColors[member.role]}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">{member.shift}</td>
                    <td className="p-4">
                      {member.status === "in" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold text-[10px]">
                          <Clock size={11} className="text-emerald-500" />
                          Đã vào ca <span className="opacity-70">@{member.clockInTime}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-bold text-[10px]">
                          Chưa vào ca
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleAttendance(member.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer font-display border uppercase ${
                          member.status === "in"
                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {member.status === "in" ? "Rời ca" : "Vào ca"}
                      </button>
                      <button className="px-3 py-1.5 bg-white text-slate-600 border border-slate-250 hover:bg-slate-50 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer font-display">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Khách hàng</th>
                  <th className="p-4">Số điện thoại</th>
                  <th className="p-4">Điểm tích lũy</th>
                  <th className="p-4">Hạng thành viên</th>
                  <th className="p-4">Gần đây nhất</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-[10px]">
                        {cust.name.split(" ").slice(-1)[0][0]}
                      </div>
                      {cust.name}
                    </td>
                    <td className="p-4 text-slate-550 font-mono font-semibold">{cust.phone}</td>
                    <td className="p-4 text-slate-700 font-black flex items-center gap-1">
                      <Award size={13} className="text-amber-500" /> {cust.points} pts
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${tierColors[cust.tier]}`}>
                        {cust.tier}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">{cust.lastVisit}</td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1.5 bg-white text-slate-600 border border-slate-250 hover:bg-slate-50 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer font-display">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
