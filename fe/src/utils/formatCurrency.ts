export function formatCurrency(amount: any): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
  return `${(num || 0).toLocaleString("vi-VN")} ₫`;
}
