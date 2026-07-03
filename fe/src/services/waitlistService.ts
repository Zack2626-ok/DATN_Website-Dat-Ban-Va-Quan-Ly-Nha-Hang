import api from "./axiosInstance";

export interface WaitlistEntry {
  id: number;
  guest_name: string;
  party_size: number;
  phone?: string;
  joined_at: string;
  notified_at?: string | null;
}

export const getWaitlist = async (): Promise<WaitlistEntry[]> => {
  const response = await api.get("/v1/waitlist");
  return response.data.data || [];
};

export const addToWaitlist = async (data: {
  guest_name: string;
  party_size: number;
  phone?: string;
}): Promise<WaitlistEntry> => {
  const response = await api.post("/v1/waitlist", data);
  return response.data.data;
};

export const notifyWaitlistGuest = async (id: number): Promise<void> => {
  await api.patch(`/v1/waitlist/${id}/notify`);
};

export const removeFromWaitlist = async (id: number): Promise<void> => {
  await api.delete(`/v1/waitlist/${id}`);
};
