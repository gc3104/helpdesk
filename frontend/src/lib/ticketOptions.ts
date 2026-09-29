import type { Priority, TicketStatus } from "../types";

/** Priority values accepted by the API and ticket forms. */
export const priorities = ["Low", "Medium", "High"] as const satisfies readonly Priority[];
/** Status values accepted by the API and ticket forms. */
export const statuses = ["Open", "In Progress", "Resolved"] as const satisfies readonly TicketStatus[];