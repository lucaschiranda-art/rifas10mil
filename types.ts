
export enum TicketStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  PAID = 'PAID',
}

export interface Ticket {
  number: number;
  status: TicketStatus;
  ownerName?: string;
  ownerContact?: string;
  reservedAt?: number; // timestamp
}

export interface Raffle {
  id: string;
  name: string;
  description: string;
  prize: string;
  imageUrl?: string;
  ticketPrice: number;
  totalTickets: number;
  drawDate: string; // ISO string
  pixKey: string;
  tickets: Ticket[];
  winner?: number;
  createdAt: number; // timestamp
}