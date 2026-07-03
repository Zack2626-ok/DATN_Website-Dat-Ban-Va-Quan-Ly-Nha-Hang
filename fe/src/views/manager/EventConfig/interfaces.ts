export interface Hall {
  id: number;
  name: string;
  capacity: number;
  description?: string;
  is_active: number; // 0 or 1
}

export interface EventPackageItem {
  id?: number;
  package_id?: number;
  menu_item_id: number;
  quantity: number;
  menu_item_name?: string;
  menu_item_price?: number;
}

export interface EventPackage {
  id: number;
  name: string;
  price_per_person: number;
  description?: string;
  is_active: number; // 0 or 1
  items: EventPackageItem[];
}
