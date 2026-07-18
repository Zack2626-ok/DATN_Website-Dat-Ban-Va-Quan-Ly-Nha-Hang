import axiosInstance from "./axiosInstance";
import { BanquetEvent } from "../interfaces/event";

export const eventService = {
  getEvents: async (): Promise<BanquetEvent[]> => {
    const response = await axiosInstance.get('/banquets');
    return response.data.data;
  },

  getEventById: async (id: number | string): Promise<BanquetEvent> => {
    const response = await axiosInstance.get(`/banquets/${id}`);
    return response.data.data;
  },

  createEvent: async (data: Partial<BanquetEvent>): Promise<BanquetEvent> => {
    const response = await axiosInstance.post('/banquets', data);
    return response.data.data;
  },

  updateEvent: async (id: number | string, data: Partial<BanquetEvent>): Promise<BanquetEvent> => {
    const response = await axiosInstance.put(`/banquets/${id}`, data);
    return response.data.data;
  },

  updateEventStatus: async (id: number | string, status: string, deposit_amount?: number): Promise<any> => {
    const response = await axiosInstance.patch(`/banquets/${id}/status`, { status, deposit_amount });
    return response.data.data;
  }
};
