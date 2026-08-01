import React, { useState } from "react";
import { ToggleLeft, ToggleRight, Save } from "lucide-react";

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
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Phân quyền hệ thống (RBAC)
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Quản lý quyền truy cập của từng vai trò trong nhà hàng
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <Save size={17} />
          Lưu cấu hình
        </button>
      </div>

    {savedMessage && (
      <div
        className="
        bg-green-50
        border
        border-green-200
        rounded-xl
        p-4
        text-green-700
        font-semibold"
      >
        Đã lưu cấu hình thành công.
      </div>
    )}

    {/* Statistic */}

    <div className="grid grid-cols-4 gap-5">

      <div className="bg-white rounded-2xl shadow p-5">
        <div className="text-sm text-slate-500">
          Quyền
        </div>

        <div className="text-3xl font-bold mt-2">
          {permissions.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <div className="text-sm text-slate-500">
          Vai trò
        </div>

        <div className="text-3xl font-bold mt-2">
          5
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <div className="text-sm text-slate-500">
          Admin
        </div>

        <div className="text-green-600 font-bold text-xl mt-2">
          Full Access
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <div className="text-sm text-slate-500">
          Trạng thái
        </div>

        <div className="text-blue-600 font-bold text-xl mt-2">
          Hoạt động
        </div>
      </div>

    </div>

    {/* TABLE */}

    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

      <div className="p-6 border-b">

        <h3 className="font-bold text-xl">
          Ma trận phân quyền
        </h3>

        <p className="text-slate-500 text-sm mt-1">
          Bật hoặc tắt quyền của từng vai trò.
        </p>

      </div>

      <div className="overflow-auto">

        <table className="w-full">

          <thead className="sticky top-0 bg-slate-100">

            <tr>

              <th className="text-left px-6 py-4">
                Quyền
              </th>

              <th className="text-center">

                <span className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs">
                  ADMIN
                </span>

              </th>

              <th className="text-center">

                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs">
                  QUẢN LÝ
                </span>

              </th>

              <th className="text-center">

                <span className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-xs">
                  THU NGÂN
                </span>

              </th>

              <th className="text-center">

                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs">
                  BẾP
                </span>

              </th>

              <th className="text-center">

                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-xs">
                  PHỤC VỤ
                </span>

              </th>

            </tr>

          </thead>

          <tbody>

            {permissions.map((row) => (

              <tr
                key={row.key}
                className="hover:bg-slate-50 transition border-b"
              >

                <td className="px-6 py-5">

                  <div className="font-bold">
                    {row.name}
                  </div>

                  <div className="text-sm text-slate-500">
                    {row.desc}
                  </div>

                </td>

                <td className="text-center">

                  <input
                    checked={row.roles.admin}
                    readOnly
                    type="checkbox"
                    className="w-5 h-5"
                  />

                </td>

                {(
                  ["manager","cashier","chef","waiter"] as RoleKey[]
                ).map((role)=>(

                  <td
                    key={role}
                    className="text-center"
                  >

                    <button
                      onClick={() =>
                        handleToggle(row.key,role)
                      }
                      className="
                      rounded-full
                      hover:bg-slate-100
                      p-2
                      transition"
                    >

                      {row.roles[role] ?

                      <ToggleRight
                        size={34}
                        className="text-green-500"
                      />

                      :

                      <ToggleLeft
                        size={34}
                        className="text-slate-400"
                      />

                      }

                    </button>

                  </td>

                ))}

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  </div>
);
};
