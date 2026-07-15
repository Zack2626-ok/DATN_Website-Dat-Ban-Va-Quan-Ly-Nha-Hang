export interface EventMenuItem {
  id?: number;
  event_id?: number;
  menu_item_id: string;
  name?: string;
  image_url?: string;
  quantity: number;
  price: number;
}

export interface EventServiceItem {
  id?: number;
  event_id?: number;
  service_name: string;
  price: number;
  vendor_name?: string;
}

export interface BanquetEvent {
  id: number;
  customer_name: string;
  customer_phone: string;
  event_type?: string;
  guest_count: number;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  area_id?: number;
  area_name?: string;
  deposit_amount: number;
  total_estimated_amount: number;
  status: 'lead' | 'quoting' | 'deposited' | 'confirmed' | 'completed' | 'cancelled';
  sales_id?: number;
  sales_name?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;

  // Relations
  menu_items?: EventMenuItem[];
  services?: EventServiceItem[];
}
