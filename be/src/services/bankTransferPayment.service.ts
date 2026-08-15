import { createHmac, timingSafeEqual } from "crypto";

export interface BankQrConfiguration {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface BankTransferWebhookData {
  paymentReference: string;
  receivedAmount: number;
  bankTransactionId: string | null;
  rawPayload: string;
}

type UnknownRecord = Record<string, unknown>;

/** Read the required dynamic VietQR account configuration from environment variables. */
export const getBankQrConfiguration = (): BankQrConfiguration => {
  const bankCode = process.env.BANK_QR_BANK_CODE?.trim();
  const accountNumber = process.env.BANK_QR_ACCOUNT_NUMBER?.trim();
  const accountName = process.env.BANK_QR_ACCOUNT_NAME?.trim();
  if (!bankCode || !accountNumber || !accountName) {
    throw new Error("Chưa cấu hình BANK_QR_BANK_CODE, BANK_QR_ACCOUNT_NUMBER hoặc BANK_QR_ACCOUNT_NAME.");
  }
  return { bankCode, accountNumber, accountName };
};

/** Build a VietQR image URL with an immutable amount and reconciliation reference. */
export const buildDynamicVietQrUrl = (
  configuration: BankQrConfiguration,
  amount: number,
  paymentReference: string,
): string => {
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: paymentReference,
    accountName: configuration.accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(configuration.bankCode)}-${encodeURIComponent(configuration.accountNumber)}-compact2.png?${params.toString()}`;
};

/** Verify an HMAC-SHA256 signature in constant time before accepting a bank webhook. */
export const verifyBankWebhookSignature = (rawPayload: Buffer, providedSignature: string | undefined): boolean => {
  const secret = process.env.BANK_WEBHOOK_SECRET;
  if (!secret || !providedSignature) return false;
  const supplied = providedSignature.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", secret).update(rawPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
};

/** Normalize common bank-provider webhook field names into the reconciliation contract. */
export const normalizeBankTransferWebhook = (payload: unknown, rawPayload: Buffer): BankTransferWebhookData | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as UnknownRecord;
  const data = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as UnknownRecord
    : record;
  const referenceValue = data.paymentReference ?? data.payment_reference ?? data.reference ?? data.addInfo ?? data.content ?? data.description
    ?? record.paymentReference ?? record.payment_reference ?? record.reference ?? record.addInfo ?? record.content ?? record.description;
  const amountValue = data.receivedAmount ?? data.received_amount ?? data.amount ?? data.transferAmount ?? data.transfer_amount
    ?? record.receivedAmount ?? record.received_amount ?? record.amount ?? record.transferAmount ?? record.transfer_amount;
  const transactionValue = data.bankTransactionId ?? data.bank_transaction_id ?? data.transactionId ?? data.transaction_id ?? data.referenceCode ?? data.id
    ?? record.bankTransactionId ?? record.bank_transaction_id ?? record.transactionId ?? record.transaction_id ?? record.referenceCode ?? record.id;
  const rawReference = typeof referenceValue === "string" ? referenceValue.trim() : "";
  const paymentReference = rawReference.match(/RM\d+-\d+-[A-F0-9]{8}/i)?.[0] ?? rawReference;
  const amount = typeof amountValue === "number"
    ? amountValue
    : typeof amountValue === "string"
      ? Number(amountValue.replace(/[^0-9.-]/g, ""))
      : Number.NaN;
  if (!paymentReference || !Number.isFinite(amount) || amount <= 0) return null;
  return {
    paymentReference,
    receivedAmount: amount,
    bankTransactionId: typeof transactionValue === "string" && transactionValue.trim() ? transactionValue.trim() : null,
    rawPayload: rawPayload.toString("utf8"),
  };
};
