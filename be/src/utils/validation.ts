/**
 * Kiểm tra xem một chuỗi có phải là số điện thoại hợp lệ (định dạng Việt Nam) hay không.
 * Số điện thoại hợp lệ:
 * - Bắt đầu bằng 0, 84 hoặc +84
 * - Theo sau là đầu số 3, 5, 7, 8, 9 (di động) hoặc 2 (số cố định mới)
 * - Độ dài tổng cộng từ 10 đến 11 chữ số (sau khi loại bỏ khoảng trắng, dấu gạch ngang)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  
  // Loại bỏ khoảng trắng và dấu gạch ngang
  const cleaned = phone.trim().replace(/[\s-]/g, "");
  
  // Regex kiểm tra số điện thoại Việt Nam
  const phoneRegex = /^(0|\+?84)(3|5|7|8|9|2)[0-9]{8,9}$/;
  
  return phoneRegex.test(cleaned);
};
