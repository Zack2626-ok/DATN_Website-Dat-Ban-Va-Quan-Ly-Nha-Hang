import customerApi from "./customerAxios";

// Interface definitions
export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  member_level: "bronze" | "silver" | "gold" | "vip";
  loyalty_points: number;
  created_at: string;
}

export interface CustomerAuthResponse {
  token: string;
  customer: Customer;
}

export interface CustomerLoyaltyTransaction {
  id: number;
  points: number;
  type: "earn" | "redeem";
  note: string | null;
  created_at: string;
}

export interface CustomerLoyaltySummary {
  loyalty_points: number;
  member_level: Customer["member_level"];
  transactions: CustomerLoyaltyTransaction[];
}

export interface CustomerTierRewardVoucher {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  points_cost: number;
  required_member_level: Customer["member_level"];
  is_unlocked: boolean;
  is_redeemed: boolean;
}

export interface CustomerOwnedVoucher {
  customer_voucher_id: number;
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  expired_at: string | null;
  redeemed_at: string;
  is_used: number;
}

export interface PublicMenuResponse {
  items: any[];
  categories: any[];
}

export interface Promotion {
  id: number;
  title: string;
  description?: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  image_url?: string;
  start_date: string;
  end_date: string;
}

export interface Hall {
  id: number;
  name: string;
  capacity: number;
  description?: string;
  is_active: number;
}

export interface EventPackage {
  id: number;
  name: string;
  price_per_person: number;
  description?: string;
  is_active: number;
  items: any[];
}

// 1. PUBLIC API CALLS
export const getPublicMenu = async (): Promise<PublicMenuResponse> => {
  const response = await customerApi.get("/v1/public/menu");
  return response.data.data;
};

export const getPublicPromotions = async (): Promise<Promotion[]> => {
  const response = await customerApi.get("/v1/public/promotions");
  return response.data.data || [];
};

export const getPublicHalls = async (): Promise<Hall[]> => {
  const response = await customerApi.get("/v1/public/halls");
  return response.data.data || [];
};

export const getPublicEventPackages = async (): Promise<EventPackage[]> => {
  const response = await customerApi.get("/v1/public/event-packages");
  return response.data.data || [];
};

// 2. CUSTOMER AUTH API CALLS
export const registerCustomer = async (data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<CustomerAuthResponse> => {
  const response = await customerApi.post("/v1/customer/register", data);
  return response.data.data;
};

export const loginCustomer = async (data: {
  email: string;
  password: string;
}): Promise<CustomerAuthResponse> => {
  const response = await customerApi.post("/v1/customer/login", data);
  return response.data.data;
};

export const getCustomerProfile = async (): Promise<Customer> => {
  const response = await customerApi.get("/v1/customer/me");
  return response.data.data;
};

export const updateCustomerProfile = async (data: {
  name?: string;
  phone?: string;
}): Promise<Customer> => {
  const response = await customerApi.patch("/v1/customer/me", data);
  return response.data.data;
};

export const changeCustomerPassword = async (data: {
  oldPassword?: string;
  newPassword?: string;
}): Promise<void> => {
  await customerApi.patch("/v1/customer/me/change-password", data);
};

export const getCustomerLoyalty = async (): Promise<CustomerLoyaltySummary> => {
  const response = await customerApi.get("/v1/customer/loyalty");
  return response.data.data;
};

export const getCustomerVouchers = async (): Promise<CustomerTierRewardVoucher[]> => {
  const response = await customerApi.get("/v1/customer/vouchers");
  return response.data.data || [];
};

export const redeemVoucher = async (voucherId: number): Promise<{ loyalty_points: number; member_level: Customer["member_level"] }> => {
  const response = await customerApi.post("/v1/customer/vouchers/redeem", { voucherId, voucher_id: voucherId });
  return response.data.data;
};

export const getMyUnusedVouchers = async (): Promise<CustomerOwnedVoucher[]> => {
  const response = await customerApi.get("/v1/customer/my-unused-vouchers");
  return response.data.data || [];
};

// 3. BOOKING API CALLS
export const getMyBookings = async (): Promise<any[]> => {
  const response = await customerApi.get("/v1/customer/bookings/my");
  return response.data.data || [];
};

export const submitBookingReview = async (
  bookingId: number,
  data: { rating: number; comment?: string }
): Promise<any> => {
  const response = await customerApi.post(`/v1/customer/bookings/${bookingId}/review`, data);
  return response.data;
};

export interface AvailableBookingTable {
  id: number;
  name: string;
  capacity: number;
  area_name?: string;
  row_pos?: string | number;
}

/** Gets tables that can serve the requested party during the full booking interval. */
export const getAvailableTables = async (
  date: string,
  time?: string,
  guests?: number,
): Promise<AvailableBookingTable[]> => {
  if (time !== undefined && guests !== undefined) {
    const response = await customerApi.get("/v1/bookings/available-tables", {
      params: { date, time, guests },
    });
    return response.data.data?.tables || [];
  } else {
    // Fallback for single startTime string
    const response = await customerApi.get(`/v1/tables/empty?start_time=${encodeURIComponent(date)}`);
    return response.data.data || [];
  }
};

export interface BookingTableAssignment {
  table_id: number;
  table_name: string;
  area_name?: string | null;
  allocated_capacity: number;
  is_primary?: number;
}

export interface CreatedBooking {
  id: number;
  confirmation_code?: string;
  guest_name?: string;
  guest_phone?: string;
  party_size?: number;
  deposit_amount?: number;
  deposit_status?: string;
  pre_order_total?: number;
  pre_ordered_items?: Array<{
    id?: number;
    menu_item_name?: string;
    quantity: number;
    unit_price: number;
  }>;
  table_name?: string;
  area_name?: string;
  table_names?: string;
  total_capacity?: number;
  table_assignments?: BookingTableAssignment[];
}

export const createBooking = async (data: {
  table_id?: number;
  table_ids?: number[];
  booking_channel?: "online" | "direct";
  customer_id?: number | null;
  promotion_id?: number | null;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  party_size: number;
  start_time: string;
  end_time: string;
  guest_note?: string;
  pre_ordered_items?: Array<{
    menu_item_id: number;
    quantity: number;
    unit_price?: number;
    name?: string;
    note?: string;
  }>;
  items?: {
    menu_item_id: number;
    quantity: number;
    unit_price?: number;
    name?: string;
    note?: string;
  }[];
}): Promise<CreatedBooking> => {
  const response = await customerApi.post("/v1/bookings", data);
  return response.data.data;
};

export const cancelBooking = async (payload: number | { id: number; reason?: string }): Promise<void> => {
  const id = typeof payload === "number" ? payload : payload.id;
  const reason = typeof payload === "object" ? payload.reason : undefined;
  await customerApi.patch(`/v1/customer/bookings/${id}/cancel`, { reason });
};

export const updateBookingContact = async (
  id: number,
  data: {
    guest_name: string;
    guest_phone: string;
    guest_email?: string;
    guest_note?: string;
  }
): Promise<void> => {
  await customerApi.patch(`/v1/customer/bookings/${id}/contact`, data);
};

export const payBookingDeposit = async (id: number): Promise<CreatedBooking> => {
  const response = await customerApi.patch(`/v1/bookings/${id}/pay-deposit`);
  return response.data.data;
};

export const createEventContract = async (data: {
  hall_id: number;
  package_id?: number | null;
  contact_name: string;
  contact_phone: string;
  event_date: string;
  guest_count: number;
  table_count: number;
  total_amount: number;
  note?: string;
}): Promise<any> => {
  const response = await customerApi.post("/v1/customer/contracts", data);
  return response.data.data;
};



export const getMyEventContracts = async (): Promise<any[]> => {
  const response = await customerApi.get("/v1/customer/contracts/my");
  return response.data.data || [];
};

export const createQROrder = async (data: {
  table_id: number;
  items: { menu_item_id: number; quantity: number; unit_price: number }[];
  guest_name?: string;
  guest_phone?: string;
  guest_count?: number;
  note?: string;
}): Promise<any> => {
  const response = await customerApi.post("/v1/waiter/qr-order", data);
  return response.data.data;
};

export const sendAIChatMessage = async (data: {
  text: string;
  messages: { role: "user" | "model"; text: string }[];
}): Promise<{ reply: string; intent?: any; booking_created?: boolean; booking?: any }> => {
  const response = await customerApi.post("/v1/public/ai-chat", data);
  return response.data.data;
};

export const verifyQRSession = async (tableId?: string | null, token?: string | null): Promise<any> => {
  try {
    const response = await customerApi.get("/v1/public/verify-qr-session", { params: { tableId, token } });
    return response.data.data;
  } catch (err) {
    return { valid: true, tableId, token };
  }
};
