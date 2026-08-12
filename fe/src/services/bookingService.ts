import api from "./axiosInstance";

export interface Booking {
  id: number;
  table_id: number;
  table_ids?: number[];
  booking_channel?: "online" | "direct";
  table_name?: string;
  table_names?: string;
  total_capacity?: number;
  area_name?: string;
  customer_id?: number | null;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  start_time: string;
  end_time: string;
  confirmation_code: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "arrived";
  guest_note?: string;
  note?: string;
  cancel_reason?: string | null;
  pre_order_total?: number;
  deposit_amount?: number;
  deposit_status?: "unpaid" | "paid" | "refunded" | "none";
  pre_ordered_items?: any[];
  created_at: string;
}

/** One table allocated to a booking, including group-booking assignments. */
export interface BookingTableAssignment {
  table_id: number;
  table_name: string;
  area_name: string | null;
  is_primary: number;
  allocated_capacity: number;
}

/** Booking row used by calendar and per-table schedule screens. */
export interface BookingScheduleItem {
  id: number;
  confirmation_code: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  party_size: number;
  start_time: string;
  end_time: string;
  status: Booking["status"];
  guest_note: string | null;
  note: string | null;
  primary_table_id: number;
  primary_table_name: string;
  table_names: string;
  table_ids: string;
  total_capacity: number;
  check_in_open_at: string;
  check_in_close_at: string;
}

export type BookingScheduleMode = "current" | "history";

export const getBookings = async (status?: string): Promise<Booking[]> => {
  const response = await api.get("/v1/bookings", { params: { status } });
  return response.data.data || [];
};

export const payBookingDeposit = async (id: number): Promise<void> => {
  await api.patch(`/v1/bookings/${id}/pay-deposit`);
};

export const getBookingById = async (id: number): Promise<Booking | null> => {
  const response = await api.get(`/v1/bookings/${id}`);
  return response.data.data || null;
};

export const createBooking = async (data: {
  table_id: number;
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
  note?: string;
}): Promise<Booking> => {
  const response = await api.post("/v1/bookings", data);
  return response.data.data;
};

/** Fetches bookings scheduled in the selected staff-calendar range. */
export const getBookingSchedule = async (params: {
  tableId?: number;
  startDate?: string;
  endDate?: string;
  includeCancelled?: boolean;
} = {}): Promise<BookingScheduleItem[]> => {
  const response = await api.get("/v1/bookings/schedule", {
    params: {
      table_id: params.tableId,
      start_date: params.startDate,
      end_date: params.endDate,
      include_cancelled: params.includeCancelled,
    },
  });
  return response.data.data || [];
};

/** Creates a staff-only direct booking, which may use the later direct-booking cutoff. */
export const createDirectBooking = async (data: {
  table_id: number;
  table_ids?: number[];
  customer_id?: number | null;
  promotion_id?: number | null;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  party_size: number;
  start_time: string;
  end_time: string;
  guest_note?: string;
  note?: string;
}): Promise<Booking> => {
  const response = await api.post("/v1/bookings/direct", data);
  return response.data.data;
};

export const updateBookingStatus = async (
  id: number,
  status: "pending" | "confirmed" | "cancelled" | "completed" | "arrived",
  cancel_reason?: string,
): Promise<void> => {
  const body: Record<string, any> = { status };
  if (cancel_reason) body.cancel_reason = cancel_reason;
  await api.patch(`/v1/bookings/${id}/status`, body);
};

export const deleteBooking = async (id: number): Promise<void> => {
  await api.delete(`/v1/bookings/${id}`);
};

export const assignBookingApi = async (id: number, payload: any): Promise<any> => {
  const response = await api.post(`/v1/bookings/${id}/assign`, payload);
  return response.data.data;
};
