export interface WaitlistCustomer {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  joinedAt: string;
  status: 'waiting' | 'notified' | 'seated' | 'cancelled';
}

export const MOCK_WAITLIST: WaitlistCustomer[] = [
  { id: '1', name: 'Nguyễn Văn A', phone: '0901234567', partySize: 4, joinedAt: '2026-06-18T13:00:00Z', status: 'waiting' },
  { id: '2', name: 'Trần Thị B', phone: '0912345678', partySize: 2, joinedAt: '2026-06-18T13:15:00Z', status: 'notified' },
  { id: '3', name: 'Lê Văn C', phone: '0923456789', partySize: 6, joinedAt: '2026-06-18T13:30:00Z', status: 'waiting' },
];
