import api from "./axiosInstance";

export interface Promotion {
  id?: number;
  title: string;
  description?: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  image_url?: string;
  start_date: string;
  end_date: string;
  is_active: number;
}

export const getPromotionsApi = async (): Promise<Promotion[]> => {
  const { data } = await api.get<{ data: Promotion[] }>("/promotions");
  return data.data || [];
};

export const getPromotionByIdApi = async (id: number | string): Promise<Promotion> => {
  const { data } = await api.get<{ data: Promotion }>(`/promotions/${id}`);
  return data.data;
};

export const createPromotionApi = async (promo: Promotion): Promise<Promotion> => {
  const { data } = await api.post<{ data: Promotion }>("/promotions", promo);
  return data.data;
};

export const updatePromotionApi = async (id: number | string, promo: Partial<Promotion>): Promise<Promotion> => {
  const { data } = await api.patch<{ data: Promotion }>(`/promotions/${id}`, promo);
  return data.data;
};

export const deletePromotionApi = async (id: number | string): Promise<void> => {
  await api.delete(`/promotions/${id}`);
};
