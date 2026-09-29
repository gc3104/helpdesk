/** Account roles supported by the API. */
export type Role = "user" | "admin";
/** Ticket priority values shared with the backend schema. */
export type Priority = "Low" | "Medium" | "High";
/** Ticket workflow states shared with the backend schema. */
export type TicketStatus = "Open" | "In Progress" | "Resolved";

/** Public account fields returned by the API. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

/** Ticket fields returned by the API. */
export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: TicketStatus;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner?: User;
}

/** Editable fields accepted when creating a ticket. */
export interface TicketCreatePayload {
  title: string;
  description: string;
  category: string;
  priority: Priority;
}

/** Ticket totals returned by the admin statistics endpoint. */
export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
}

/** Response returned after registering or signing in. */
export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

/** Optional filters for the admin ticket queue. */
export interface AdminFilters {
  status: string;
  priority: string;
  q: string;
}

/** Active bearer token and signed-in account. */
export interface Session {
  token: string;
  user: User;
}