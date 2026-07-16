import api from "./axiosInstance";

export interface RestaurantInfo {
  id: number;
  name: string;
  address: string;
  hotline: string;
  hotline_hours: string;
  email: string;
  opening_hours: string;
  happy_hour: string;
  map_url?: string;
  tax_rate: number;
  service_fee_rate: number;
  default_payment_method: string;
  timezone: string;
}

export const getRestaurantInfo = async (): Promise<RestaurantInfo> => {
  const response = await api.get("/restaurant-info");
  return response.data.data;
};

export const updateRestaurantInfo = async (data: Partial<RestaurantInfo>): Promise<RestaurantInfo> => {
  const response = await api.put("/restaurant-info", data);
  return response.data.data;
};
