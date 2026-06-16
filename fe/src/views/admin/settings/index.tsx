import React, { useState } from "react";
import { Save, Settings } from "lucide-react";

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "tax">("general");
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-700">Cấu hình hệ thống</h1>
          <p className="mt-1 text-sm text-gray-500">Thiết lập thông tin nhà hàng, thuế và phí dịch vụ</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Save size={16} />
          Lưu cấu hình
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2">
        {[
          { key: "general" as const, label: "Thông tin chung" },
          { key: "tax" as const, label: "Thuế & Phí DV" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === tab.key ? "bg-blue-700 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {savedMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Cập nhật cấu hình thành công!
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {activeTab === "general" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-gray-700">Tên nhà hàng</span>
              <input
                type="text"
                defaultValue="ResManager Bistro"
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-gray-700">Địa chỉ</span>
              <input
                type="text"
                defaultValue="123 Nguyễn Huệ, Quận 1, TP.HCM"
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-gray-700">Hotline</span>
              <input
                type="text"
                defaultValue="028 3829 4000"
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-gray-700">Múi giờ</span>
              <select className="rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-700 focus:outline-none">
                <option>GMT+07:00 (Hà Nội, TP.HCM)</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-gray-700">VAT (%)</span>
              <input
                type="number"
                defaultValue={10}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-gray-700">Phí dịch vụ (%)</span>
              <input
                type="number"
                defaultValue={5}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Phương thức thanh toán mặc định</span>
              <select className="rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-700 focus:outline-none">
                <option>Tiền mặt</option>
                <option>Chuyển khoản</option>
                <option>Thẻ / Ví điện tử</option>
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Settings size={14} />
        Chỉ Admin/Chủ nhà hàng có quyền thay đổi cấu hình hệ thống
      </div>
    </div>
  );
};
