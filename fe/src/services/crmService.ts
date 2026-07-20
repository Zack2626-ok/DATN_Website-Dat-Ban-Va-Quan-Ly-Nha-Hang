import api from "./axiosInstance";

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  member_level: "bronze" | "silver" | "gold" | "vip";
  loyalty_points: number;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  points: number;
  type: "earn" | "redeem";
  ref_invoice_id: number | null;
  note: string | null;
  created_at: string;
  invoice_total?: number;
}

export interface Voucher {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  expired_at: string | null;
  is_active: number;
  created_at: string;
}

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  image_url: string | null;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
}

export const crmService = {
  // Customers API
  getCustomers: async (): Promise<Customer[]> => {
    const res = await api.get("/v1/crm/customers");
    return res.data.data || [];
  },
  createCustomer: async (data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    loyalty_points?: number;
  }): Promise<Customer> => {
    const res = await api.post("/v1/crm/customers", data);
    return res.data.data;
  },
  updateCustomer: async (id: number, data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    loyalty_points?: number;
  }): Promise<Customer> => {
    const res = await api.put(`/v1/crm/customers/${id}`, data);
    return res.data.data;
  },
  deleteCustomer: async (id: number): Promise<void> => {
    await api.delete(`/v1/crm/customers/${id}`);
  },
  getCustomerLoyalty: async (id: number): Promise<LoyaltyTransaction[]> => {
    const res = await api.get(`/v1/crm/customers/${id}/loyalty`);
    return res.data.data || [];
  },

  // Vouchers API
  getVouchers: async (): Promise<Voucher[]> => {
    const res = await api.get("/v1/crm/vouchers");
    return res.data.data || [];
  },
  createVoucher: async (data: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    min_order?: number;
    max_uses?: number | null;
    expired_at?: string | null;
    is_active?: number;
  }): Promise<Voucher> => {
    const res = await api.post("/v1/crm/vouchers", data);
    return res.data.data;
  },
  updateVoucher: async (id: number, data: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    min_order?: number;
    max_uses?: number | null;
    expired_at?: string | null;
    is_active?: number;
  }): Promise<Voucher> => {
    const res = await api.put(`/v1/crm/vouchers/${id}`, data);
    return res.data.data;
  },
  deleteVoucher: async (id: number): Promise<void> => {
    await api.delete(`/v1/crm/vouchers/${id}`);
  },

  // Promotions API
  getPromotions: async (): Promise<Promotion[]> => {
    const res = await api.get("/v1/crm/promotions");
    return res.data.data || [];
  },
  createPromotion: async (data: {
    title: string;
    description?: string | null;
    discount_type: "percent" | "fixed";
    discount_value: number;
    image_url?: string | null;
    start_date: string;
    end_date: string;
    is_active?: number;
  }): Promise<Promotion> => {
    const res = await api.post("/v1/crm/promotions", data);
    return res.data.data;
  },
  updatePromotion: async (id: number, data: {
    title: string;
    description?: string | null;
    discount_type: "percent" | "fixed";
    discount_value: number;
    image_url?: string | null;
    start_date: string;
    end_date: string;
    is_active?: number;
  }): Promise<Promotion> => {
    const res = await api.put(`/v1/crm/promotions/${id}`, data);
    return res.data.data;
  },
  deletePromotion: async (id: number): Promise<void> => {
    await api.delete(`/v1/crm/promotions/${id}`);
  },
};
