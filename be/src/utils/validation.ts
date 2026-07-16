/**
 * Kiểm tra xem một chuỗi có phải là số điện thoại hợp lệ (định dạng Việt Nam) hay không.
 * Số điện thoại hợp lệ:
 * - Bắt đầu bằng 0, 84 hoặc +84
 * - Theo sau là đầu số 3, 5, 7, 8, 9 (di động) hoặc 2 (số cố định mới)
 * - Độ dài tổng cộng từ 10 đến 11 chữ số (sau khi loại bỏ khoảng trắng, dấu gạch ngang)
 */
export const getPhoneNumberValidationError = (phone: string): string | null => {
  if (!phone || phone.trim() === "") {
    return "Số điện thoại không được để trống.";
  }
  
  const hasLetters = /[a-zA-Z]/g.test(phone);
  // Cho phép chữ số, dấu cộng (+), gạch ngang (-), khoảng trắng
  const cleanRegex = /^[0-9+\s-]+$/;
  if (hasLetters || !cleanRegex.test(phone)) {
    return "Số điện thoại chỉ được chứa các chữ số, dấu cộng (+), dấu gạch ngang (-) hoặc khoảng trắng.";
  }

  const cleaned = phone.trim().replace(/[\s-]/g, "");

  if (cleaned.startsWith("+840") || cleaned.startsWith("840")) {
    return "Khi sử dụng mã quốc gia '+84' hoặc '84', vui lòng bỏ số '0' ở đầu số điện thoại tiếp theo (ví dụ: +84912345678).";
  }

  if (!cleaned.startsWith("0") && !cleaned.startsWith("+84") && !cleaned.startsWith("84")) {
    return "Số điện thoại Việt Nam phải bắt đầu bằng số '0', '84' hoặc mã quốc gia '+84'.";
  }

  if (cleaned.length < 10 || cleaned.length > 12) {
    return "Số điện thoại không đúng độ dài (phải từ 10 đến 12 ký tự).";
  }

  // Tìm chữ số đầu số di động / bàn
  let prefixDigit = "";
  if (cleaned.startsWith("0")) {
    prefixDigit = cleaned.charAt(1);
  } else if (cleaned.startsWith("+84")) {
    prefixDigit = cleaned.charAt(3);
  } else if (cleaned.startsWith("84")) {
    prefixDigit = cleaned.charAt(2);
  }

  const validPrefixes = ["3", "5", "7", "8", "9", "2"];
  if (!validPrefixes.includes(prefixDigit)) {
    return "Đầu số nhà mạng không hợp lệ. Vui lòng nhập đầu số di động hợp lệ (bắt đầu bằng 03, 05, 07, 08, 09) hoặc số cố định (bắt đầu bằng 02).";
  }

  return null;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  return getPhoneNumberValidationError(phone) === null;
};
