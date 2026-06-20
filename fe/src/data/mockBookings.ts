export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  tableId?: string;
  tableName?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  note?: string;
  createdAt: string;
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "BK001",
    customerName: "Nguyễn Văn A",
    phone: "0912345678",
    email: "vana@example.com",
    date: "2024-06-20",
    time: "18:00",
    guests: 4,
    tableId: "1",
    tableName: "Bàn 01",
    status: 'pending',
    createdAt: "2024-06-18 10:00",
  },
  {
    id: "BK002",
    customerName: "Trần Thị B",
    phone: "0987654321",
    date: "2024-06-20",
    time: "19:00",
    guests: 2,
    tableId: "2",
    tableName: "Bàn 02",
    status: 'confirmed',
    createdAt: "2024-06-18 11:30",
  },
  {
    id: "BK003",
    customerName: "Lê Văn C",
    phone: "0905123456",
    date: "2024-06-21",
    time: "12:00",
    guests: 6,
    status: 'pending',
    createdAt: "2024-06-19 09:15",
  }
];
