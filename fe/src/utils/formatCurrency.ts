/**
 * formatCurrency - Định dạng tiền VND theo UI Spec ResManager
 * formatCurrency(85000) → "85.000 ₫"
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}
