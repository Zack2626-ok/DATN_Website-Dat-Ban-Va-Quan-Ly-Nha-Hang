const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const data = [
  {
    "Tên nguyên liệu": "Thịt bò", // Cũ
    "Số lượng": 15.5,
    "Đơn vị": "kg",
    "Đơn giá": 260000,
    "Nhà cung cấp": "Công ty TNHH Thực phẩm ABC",
    "Hạn sử dụng": "2026-09-15"
  },
  {
    "Tên nguyên liệu": "Saffron (Nhụy hoa nghệ tây)", // Mới
    "Số lượng": 0.5,
    "Đơn vị": "kg",
    "Đơn giá": 5000000,
    "Nhà cung cấp": "Công ty TNHH Thực phẩm ABC",
    "Hạn sử dụng": "2027-12-31"
  },
  {
    "Tên nguyên liệu": "Gia vị lẩu tổng hợp", // Mới, không NCC, không HSD
    "Số lượng": 10,
    "Đơn vị": "gói",
    "Đơn giá": 50000,
    "Nhà cung cấp": "", // Khuyết
    "Hạn sử dụng": "" // Khuyết
  }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

const outputPath = path.join('C:\\Users\\ADMIN\\Desktop\\DATN', 'Test_Nhap_Kho_FEFO.xlsx');
xlsx.writeFile(wb, outputPath);

console.log(`Đã tạo file Excel thành công tại: ${outputPath}`);
