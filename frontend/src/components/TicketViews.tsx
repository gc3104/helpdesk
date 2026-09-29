import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { formatDate, getErrorMessage, request } from "../lib/api";
import { priorities, statuses } from "../lib/ticketOptions";
import { Button, ErrorMessage, Field, Input, Select, Textarea } from "./ui";
import type { Priority, Ticket, TicketCreatePayload, TicketStatus } from "../types";

/** Props used by the ticket create and edit form. */
interface TicketFormProps {
  token: string;
  ticket?: Ticket;
  onSaved: (ticket: Ticket) => void;
}

/** Props controlling the native ticket dialog. */
interface TicketDialogProps extends TicketFormProps {
  open: boolean;
  onClose: () => void;
}

/** Data and actions rendered by the ticket list. */
interface TicketListProps {
  tickets: Ticket[];
  admin?: boolean;
  onStatusChange?: (id: number, status: TicketStatus) => void;
  onEdit?: (ticket: Ticket) => void;
  onDelete?: (id: number) => void;
}

interface BadgeProps {
  value: Priority | TicketStatus;
  kind: "priority" | "status";
}

/** Validate and submit a new ticket or changes to an existing ticket. */
export function TicketForm({ token, ticket, onSaved }: TicketFormProps) {
  const [form, setForm] = useState<TicketCreatePayload>(() => ticket ? {
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
  } : { title: "", description: "", category: "", priority: "Medium" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const title = form.title.trim();
    const description = form.description.trim();
    const category = form.category.trim();
    if (title.length < 3 || title.length > 140) {
      setError("Title must be 3 to 140 characters after trimming.");
      return;
    }
    if (category.length < 2 || category.length > 60) {
      setError("Category must be 2 to 60 characters after trimming.");
      return;
    }
    if (description.length < 10 || description.length > 5000) {
      setError("Description must be 10 to 5000 characters after trimming.");
      return;
    }
    setSaving(true);
    try {
      const savedTicket = await request<Ticket>(ticket ? `/tickets/${ticket.id}` : "/tickets", {
        token,
        method: ticket ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, title, description, category }),
      });
      onSaved(savedTicket);
      if (!ticket) setForm({ title: "", description: "", category: "", priority: "Medium" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-5">
        <Field label="Title"><Input name="title" value={form.title} onChange={update} minLength={3} maxLength={140} required placeholder="Briefly describe the issue" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category"><Input name="category" value={form.category} onChange={update} minLength={2} maxLength={60} required placeholder="e.g. Billing" /></Field>
          <Field label="Priority"><Select name="priority" value={form.priority} onChange={update}>{priorities.map((value) => <option key={value}>{value}</option>)}</Select></Field>
        </div>
        <Field label="Description"><Textarea name="description" value={form.description} onChange={update} minLength={10} maxLength={5000} rows={5} required placeholder="Include details that help the support team investigate." /></Field>
        <ErrorMessage>{error}</ErrorMessage>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : ticket ? "Save changes" : "Create ticket"}</Button>
      </div>
    </form>
  );
}

/** Show the ticket form in a modal dialog. */
export function TicketDialog({ open, token, ticket, onClose, onSaved }: TicketDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="ticket-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
        dialogRef.current?.close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          dialogRef.current?.close();
        }
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-[#dce7df] bg-white p-0 text-[#20372f] shadow-2xl backdrop:bg-[#142b24]/60"
    >
      <div className="p-6 sm:p-8">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#64786c]">New request</p>
            <h2 id="ticket-dialog-title" className="mt-1 text-xl font-bold text-[#20372f]">{ticket ? "Edit ticket" : "Create a ticket"}</h2>
          </div>
          <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>Close</Button>
        </header>
        <TicketForm key={ticket?.id ?? "new"} token={token} ticket={ticket} onSaved={onSaved} />
      </div>
    </dialog>
  );
}

/** Display a ticket priority or status with its matching color. */
function Badge({ value, kind }: BadgeProps) {
  const priorityStyles: Record<Priority, string> = {
    Low: "bg-[#e2efe6] text-[#365b49]",
    Medium: "bg-[#f7edcf] text-[#715a1c]",
    High: "bg-[#f8e2d8] text-[#884630]",
  };
  const statusStyles: Record<TicketStatus, string> = {
    Open: "bg-[#dcefe7] text-[#245847]",
    "In Progress": "bg-[#f7edcf] text-[#715a1c]",
    Resolved: "bg-[#e2efe6] text-[#365b49]",
  };
  const badgeStyle = kind === "priority"
    ? priorityStyles[value as Priority]
    : statusStyles[value as TicketStatus];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle}`}>{value}</span>;
}

/** Render tickets with actions appropriate to the current role. */
export function TicketList({ tickets, admin = false, onStatusChange, onEdit, onDelete }: TicketListProps) {
  if (!tickets.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#cbdacf] bg-white px-6 py-14 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#e7f1e9] text-xl text-[#365b49]" aria-hidden="true">✓</div>
        <h3 className="mt-4 font-semibold text-[#20372f]">No tickets found</h3>
        <p className="mt-1 text-sm text-[#64786c]">Create a request or adjust the filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <article key={ticket.id} className="rounded-lg border border-[#dce7df] bg-white p-4 transition hover:border-[#afc7b7] sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 max-w-full break-words font-semibold text-[#20372f] [overflow-wrap:anywhere]">{ticket.title}</h3>
                <Badge value={ticket.priority} kind="priority" />
                <Badge value={ticket.status} kind="status" />
              </div>
              <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-[#52685c] [overflow-wrap:anywhere]">{ticket.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#64786c] [overflow-wrap:anywhere]">
                <span className="break-all">{ticket.category}</span>
                {admin && ticket.owner && <span className="break-all">Submitted by {ticket.owner.name} ({ticket.owner.email})</span>}
                <span>Created {formatDate(ticket.created_at)}</span>
                <span>Updated {formatDate(ticket.updated_at)}</span>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-stretch gap-2 lg:max-w-xs lg:justify-end">
              {admin ? (
                <Select className="w-full lg:w-auto lg:min-w-48" aria-label={`Status for ${ticket.title}`} value={ticket.status} onChange={(event) => onStatusChange?.(ticket.id, event.target.value as TicketStatus)}>
                  {statuses.map((value) => <option key={value}>{value}</option>)}
                </Select>
              ) : (
                <>
                  <Button type="button" className="w-full whitespace-nowrap sm:w-auto" onClick={() => onStatusChange?.(ticket.id, ticket.status === "Resolved" ? "Open" : "Resolved")}>
                    {ticket.status === "Resolved" ? "Reopen" : "Mark resolved"}
                  </Button>
                  <Button type="button" variant="secondary" className="flex-1 whitespace-nowrap sm:flex-none" onClick={() => onEdit?.(ticket)}>Edit</Button>
                  <Button type="button" variant="danger" className="flex-1 whitespace-nowrap sm:flex-none" onClick={() => onDelete?.(ticket.id)}>Delete</Button>
                </>
              )}
            </div>
          </div>
          <details className="mt-4 border-t border-[#e7eee9] pt-3">
            <summary className="w-fit cursor-pointer text-sm font-semibold text-[#365b49] underline underline-offset-2">View full ticket details</summary>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#365044] [overflow-wrap:anywhere]">{ticket.description}</p>
          </details>
        </article>
      ))}
    </div>
  );
}