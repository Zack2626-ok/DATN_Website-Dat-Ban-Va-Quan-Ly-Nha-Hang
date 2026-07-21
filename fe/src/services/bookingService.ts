import api from "./axiosInstance";

export interface Booking {
  id: number;
  table_id: number;
  table_name?: string;
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
  created_at: string;
}

export const getBookings = async (status?: string): Promise<Booking[]> => {
  const response = await api.get("/v1/bookings", { params: { status } });
  return response.data.data || [];
};

export const getBookingById = async (id: number): Promise<Booking | null> => {
  const response = await api.get(`/v1/bookings/${id}`);
  return response.data.data || null;
};

export const createBooking = async (data: {
  table_id: number;
  customer_id?: number | null;
  promotion_id?: number | null;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  start_time: string;
  end_time: string;
  guest_note?: string;
  note?: string;
}): Promise<Booking> => {
  const response = await api.post("/v1/bookings", data);
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
