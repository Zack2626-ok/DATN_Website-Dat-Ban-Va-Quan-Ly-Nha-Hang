import React, { useState } from "react";
import { Plus } from "lucide-react";
import { HallsTab } from "./components/HallsTab";
import { PackagesTab } from "./components/PackagesTab";

/**
 * BanquetConfig - Màn hình cấu hình Sự kiện & Tiệc cho Manager
 */
const BanquetConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"halls" | "packages">("halls");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cấu hình Sự kiện & Tiệc</h1>
          <p className="text-gray-500 mt-1">Quản lý sảnh tiệc và gói set menu</p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff474d] transition-colors font-medium"
        >
          <Plus size={18} />
          Thêm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("halls")}
            className={`pb-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "halls"
                ? "border-[#FF5A5F] text-[#FF5A5F]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Quản lý Sảnh
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`pb-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "packages"
                ? "border-[#FF5A5F] text-[#FF5A5F]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Gói Set Menu Tiệc
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === "halls" ? (
          <HallsTab
            isDrawerOpen={isDrawerOpen && activeTab === "halls"}
            onDrawerClose={() => setIsDrawerOpen(false)}
          />
        ) : (
          <PackagesTab
            isDrawerOpen={isDrawerOpen && activeTab === "packages"}
            onDrawerClose={() => setIsDrawerOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default BanquetConfig;
