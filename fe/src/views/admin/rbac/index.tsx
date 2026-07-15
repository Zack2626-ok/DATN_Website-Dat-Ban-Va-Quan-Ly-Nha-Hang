import React, { useState } from "react";
import { ToggleLeft, ToggleRight, Info, Save } from "lucide-react";

type RoleKey = "admin" | "manager" | "cashier" | "chef" | "waiter";

interface PermissionRow {
  key: string;
  name: string;
  desc: string;
  roles: Record<RoleKey, boolean>;
}

const INITIAL_PERMISSIONS: PermissionRow[] = [
  {
    key: "refund",
    name: "Hoàn tiền đơn hàng",
    desc: "Cho phép hoàn tiền toàn bộ hoặc một phần đơn hàng",
    roles: { admin: true, manager: true, cashier: false, chef: false, waiter: false },
  },
  {
    key: "cancel_item",
    name: "Hủy món trong đơn",
    desc: "Cho phép xóa món khỏi đơn hàng đã tạo",
    roles: { admin: true, manager: true, cashier: true, chef: false, waiter: false },
  },
  {
    key: "financials",
    name: "Xem báo cáo tài chính",
    desc: "Truy cập báo cáo doanh thu và lợi nhuận",
    roles: { admin: true, manager: true, cashier: false, chef: false, waiter: false },
  },
  {
    key: "menu",
    name: "Quản lý thực đơn",
    desc: "Thêm, sửa, xóa món ăn và giá cả",
    roles: { admin: true, manager: true, cashier: false, chef: false, waiter: false },
  },
  {
    key: "staff",
    name: "Quản lý nhân viên",
    desc: "Thêm, sửa, xóa tài khoản nhân viên",
    roles: { admin: true, manager: true, cashier: false, chef: false, waiter: false },
  },
  {
    key: "inventory",
    name: "Quản lý tồn kho",
    desc: "Nhập xuất kho, kiểm kê nguyên liệu",
    roles: { admin: true, manager: true, cashier: false, chef: true, waiter: false },
  },
  {
    key: "discount",
    name: "Áp dụng giảm giá",
    desc: "Cho phép giảm giá đơn hàng",
    roles: { admin: true, manager: true, cashier: true, chef: false, waiter: false },
  },
  {
    key: "split",
    name: "Tách hóa đơn",
    desc: "Chia bill cho nhiều người",
    roles: { admin: true, manager: true, cashier: true, chef: false, waiter: false },
  },
  {
    key: "edit_closed",
    name: "Sửa đơn đã đóng",
    desc: "Chỉnh sửa đơn hàng đã thanh toán",
    roles: { admin: true, manager: false, cashier: false, chef: false, waiter: false },
  },
];

export const AdminRbac: React.FC = () => {
  const [activeTab] = useState<"rbac">("rbac");
  const [permissions, setPermissions] = useState<PermissionRow[]>(INITIAL_PERMISSIONS);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  // Toggle single cell
  const handleToggle = (rowKey: string, role: RoleKey) => {
    // Admin permissions cannot be turned off for core actions to prevent lockout
    if (role === "admin") return;

    setPermissions((prev) =>
      prev.map((row) => {
        if (row.key === rowKey) {
          return {
            ...row,
            roles: {
              ...row.roles,
              [role]: !row.roles[role],
            },
          };
        }
        return row;
      })
    );
  };

  const handleSaveSettings = () => {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-800">
      
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black font-display text-slate-900">Phân quyền vai trò (RBAC)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý quyền truy cập và tài khoản nhân viên theo vai trò
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-display flex items-center gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all cursor-pointer"
        >
          <Save size={14} /> Lưu cấu hình
        </button>
      </div>

      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl p-4 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Info size={14} className="text-emerald-600" /> Cập nhật cấu hình thành công! Ma trận phân quyền đã được lưu trữ cục bộ.
        </div>
      )}

      {/* Dynamic Tab Content rendering */}
      {activeTab === "rbac" ? (
        <div className="bg-[#1C2541]/40 backdrop-blur-xl rounded-2xl border border-slate-200 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.4)] p-6 flex flex-col gap-5">
          <div>
            <h4 className="text-base font-black text-slate-900 font-display">Ma trận Phân quyền (RBAC)</h4>
            <p className="text-xs text-slate-400 mt-1">Quản lý quyền truy cập cho từng vai trò nhân viên</p>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4 min-w-[240px]">Quyền truy cập</th>
                  <th className="p-4 text-center">Admin</th>
                  <th className="p-4 text-center">Quản lý</th>
                  <th className="p-4 text-center">Thu ngân</th>
                  <th className="p-4 text-center">Bếp trưởng</th>
                  <th className="p-4 text-center">Phục vụ</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-slate-850">{row.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{row.desc}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={row.roles.admin}
                        readOnly
                        className="w-3.5 h-3.5 rounded border-slate-350 text-slate-900 focus:ring-0 opacity-70 cursor-not-allowed"
                      />
                    </td>
                    {[
                      { key: "manager", label: "Quản lý" },
                      { key: "cashier", label: "Thu ngân" },
                      { key: "chef", label: "Bếp trưởng" },
                      { key: "waiter", label: "Phục vụ" },
                    ].map((roleObj) => {
                      const rKey = roleObj.key as RoleKey;
                      const hasPerm = row.roles[rKey];
                      return (
                        <td key={rKey} className="p-4 text-center">
                          <button
                            onClick={() => handleToggle(row.key, rKey)}
                            className="inline-flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
                          >
                            {hasPerm ? (
                              <ToggleRight size={32} className="text-slate-900 transition-all" />
                            ) : (
                              <ToggleLeft size={32} className="text-slate-300 transition-all" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};
