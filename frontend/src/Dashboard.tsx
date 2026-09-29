import { useEffect, useState, type ChangeEvent } from "react";
import { getErrorMessage, request } from "./lib/api";
import { priorities, statuses } from "./lib/ticketOptions";
import { PasswordDialog } from "./components/PasswordDialog";
import { TicketDialog, TicketList } from "./components/TicketViews";
import { Button, ConfirmDialog, ErrorMessage, Field, Input, Loading, Select, Workspace } from "./components/ui";
import type { AdminFilters, Session, Ticket, TicketStats, TicketStatus } from "./types";

/** Shared session props for both role-specific workspaces. */
type DashboardProps = Pick<Session, "token" | "user"> & { onLogout: () => void };

/** Show the signed-in customer's tickets and editing actions. */
function UserDashboard({ token, user, onLogout }: DashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>();
  const [deletingTicketId, setDeletingTicketId] = useState<number | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useEffect(() => {
    request<Ticket[]>("/tickets", { token })
      .then((data) => {
        setTickets(data);
        setError("");
      })
      .catch((err: unknown) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  /** Save a customer-requested resolve or reopen action. */
  async function changeStatus(id: number, status: TicketStatus) {
    try {
      const updated = await request<Ticket>(`/tickets/${id}/status`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTickets((current) => current.map((ticket) => ticket.id === id ? updated : ticket));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  /** Delete the ticket selected in the confirmation dialog. */
  async function deleteTicket(): Promise<void> {
    if (deletingTicketId === null) return;
    try {
      await request<void>(`/tickets/${deletingTicketId}`, { token, method: "DELETE" });
      setTickets((current) => current.filter((ticket) => ticket.id !== deletingTicketId));
      setDeletingTicketId(null);
    } catch (err) {
      setDeletingTicketId(null);
      setError(getErrorMessage(err));
    }
  }

  return (
    <Workspace user={user} onLogout={onLogout} onChangePassword={() => setPasswordDialogOpen(true)} title="My tickets" subtitle="Track every support request you have raised.">
      <div className="space-y-8">
        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-[#64786c]">Your work</p><h2 className="mt-1 text-xl font-bold text-[#20372f]">All tickets</h2></div>
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <span
                className="min-w-0 max-w-[45%] break-all rounded-full bg-[#e2ece5] px-3 py-1.5 text-right text-xs font-semibold leading-5 text-[#365b49] sm:max-w-none sm:break-normal"
                title={`${tickets.length} total tickets`}
                aria-label={`${tickets.length} total tickets`}
              >
                {tickets.length} total
              </span>
              <Button type="button" className="flex-1 sm:flex-none" onClick={() => { setEditingTicket(undefined); setTicketDialogOpen(true); }}>Create ticket</Button>
            </div>
          </div>
          <ErrorMessage>{error}</ErrorMessage>
          {loading ? <Loading text="Loading tickets..." /> : <TicketList tickets={tickets} onStatusChange={changeStatus} onEdit={(ticket) => { setEditingTicket(ticket); setTicketDialogOpen(true); }} onDelete={(id) => setDeletingTicketId(id)} />}
        </section>
      </div>
      <TicketDialog
        open={ticketDialogOpen}
        token={token}
        ticket={editingTicket}
        onClose={() => setTicketDialogOpen(false)}
        onSaved={(ticket: Ticket) => {
          setTickets((current) => editingTicket ? current.map((currentTicket) => currentTicket.id === ticket.id ? ticket : currentTicket) : [ticket, ...current]);
          setTicketDialogOpen(false);
          setEditingTicket(undefined);
        }}
      />
      <ConfirmDialog
        open={deletingTicketId !== null}
        title="Delete this ticket?"
        message="This permanently removes the ticket and its details. This action cannot be undone."
        confirmLabel="Delete ticket"
        onCancel={() => setDeletingTicketId(null)}
        onConfirm={deleteTicket}
      />
      <PasswordDialog open={passwordDialogOpen} token={token} onClose={() => setPasswordDialogOpen(false)} />
    </Workspace>
  );
}

/** Show all tickets, filters, status controls, and admin totals. */
function AdminDashboard({ token, user, onLogout }: DashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [filters, setFilters] = useState<AdminFilters>({ status: "", priority: "", q: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  /** Fetch the queue and overall counts, applying the selected filters. */
  async function loadDashboard(nextFilters: AdminFilters = filters): Promise<void> {
    setLoading(true);
    const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
    try {
      // Load the filtered queue and unfiltered totals together.
      const [ticketData, statData] = await Promise.all([
        request<Ticket[]>(`/admin/tickets?${params}`, { token }),
        request<TicketStats>("/admin/stats", { token }),
      ]);
      setTickets(ticketData);
      setStats(statData);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    Promise.all([
      request<Ticket[]>(`/admin/tickets?${params}`, { token }),
      request<TicketStats>("/admin/stats", { token }),
    ])
      .then(([ticketData, statData]) => {
        setTickets(ticketData);
        setStats(statData);
        setError("");
      })
      .catch((err: unknown) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  /** Keep filter state keyed to each control's name. */
  function updateFilter(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  /** Save an admin status change and refresh the dashboard data. */
  async function changeStatus(id: number, status: TicketStatus) {
    try {
      await request(`/admin/tickets/${id}/status`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadDashboard();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const statCards = [
    { label: "Total tickets", value: stats.total, className: "bg-[#205448] text-white" },
    { label: "Open", value: stats.open, className: "bg-[#dcefe7] text-[#245847]" },
    { label: "In progress", value: stats.in_progress, className: "bg-[#f7edcf] text-[#715a1c]" },
    { label: "Resolved", value: stats.resolved, className: "bg-[#f8e2d8] text-[#884630]" },
  ];

  return (
    <Workspace user={user} onLogout={onLogout} onChangePassword={() => setPasswordDialogOpen(true)} title="Support overview" subtitle="Monitor every request and keep work flowing.">
      <div className="space-y-8">
        <section aria-label="Ticket statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-lg p-5 ${card.className}`}>
              <span className="text-sm font-semibold">{card.label}</span>
              <strong className="mt-4 block text-3xl font-bold">{card.value}</strong>
            </div>
          ))}
        </section>
        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-[#64786c]">Operations</p><h2 className="mt-1 text-xl font-bold text-[#20372f]">All tickets</h2></div>
            <span
              className="min-w-0 max-w-[45%] break-all rounded-full bg-[#e2ece5] px-3 py-1.5 text-right text-xs font-semibold leading-5 text-[#365b49] sm:max-w-none sm:break-normal"
              title={`${tickets.length} tickets shown`}
              aria-label={`${tickets.length} tickets shown`}
            >
              {tickets.length} shown
            </span>
          </div>
          <form className="mb-5 grid gap-3 rounded-lg border border-[#dce7df] bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); loadDashboard(filters); }}>
            <Field label="Search title"><Input name="q" value={filters.q} onChange={updateFilter} maxLength={140} placeholder="Search tickets..." /></Field>
            <Field label="Status"><Select name="status" value={filters.status} onChange={updateFilter}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</Select></Field>
            <Field label="Priority"><Select name="priority" value={filters.priority} onChange={updateFilter}><option value="">All priorities</option>{priorities.map((value) => <option key={value}>{value}</option>)}</Select></Field>
            <div className="flex items-end"><Button type="submit" disabled={loading} className="w-full lg:w-auto">Apply filters</Button></div>
          </form>
          <ErrorMessage>{error}</ErrorMessage>
          {loading ? <Loading text="Loading dashboard..." /> : <TicketList tickets={tickets} admin onStatusChange={changeStatus} />}
        </section>
      </div>
      <PasswordDialog open={passwordDialogOpen} token={token} onClose={() => setPasswordDialogOpen(false)} />
    </Workspace>
  );
}

export { AdminDashboard, UserDashboard };