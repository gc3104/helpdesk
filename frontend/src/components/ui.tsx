import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type { User } from "../types";

/** Native button attributes plus the shared visual variants. */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

/** Label and content displayed by a form field. */
interface FieldProps {
  label: string;
  children: ReactNode;
}

/** Shared account header and page layout props. */
interface WorkspaceProps {
  user: User;
  onLogout: () => void;
  onChangePassword: () => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Render a button using one of the shared action styles. */
export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-[#205448] text-white hover:bg-[#173f36] focus:ring-[#a8cbb9]",
    secondary: "border border-[#d2e0d7] bg-white text-[#29453b] hover:bg-[#f2f7f3] focus:ring-[#c8ddd0]",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50 focus:ring-red-200",
  };

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-wait disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Render a consistently styled text input. */
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-[#cbdacf] bg-white px-3.5 py-2.5 text-sm text-[#20372f] outline-none placeholder:text-[#819187] focus:border-[#4c806c] focus:ring-4 focus:ring-[#e7f1e9] ${className}`}
      {...props}
    />
  );
}

/** Render a consistently styled select control. */
export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full min-w-0 rounded-md border border-[#cbdacf] bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-[#20372f] shadow-sm outline-none transition-colors hover:border-[#9dbba7] hover:bg-[#fbfdfb] focus:border-[#4c806c] focus:ring-4 focus:ring-[#e7f1e9] [color-scheme:light] ${className}`}
      {...props}
    />
  );
}

/** Render a consistently styled multiline input. */
export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full resize-y rounded-md border border-[#cbdacf] bg-white px-3.5 py-2.5 text-sm text-[#20372f] outline-none placeholder:text-[#819187] focus:border-[#4c806c] focus:ring-4 focus:ring-[#e7f1e9] ${className}`}
      {...props}
    />
  );
}

/** Pair a visible label with its form control. */
export function Field({ label, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#29453b]">{label}</span>
      {children}
    </label>
  );
}

/** Show an accessible error message when one is present. */
export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {children}
    </div>
  );
}

/** Show a loading status with an optional label. */
export function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-[#52685c]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d2e0d7] border-t-[#205448]" />
      {text}
    </div>
  );
}

/** Render the Helpdesk wordmark for its current background. */
export function Brand({ mobile = false, light = false }: { mobile?: boolean; light?: boolean }) {
  return (
    <div className={mobile ? "flex items-center gap-2" : "flex items-center gap-3"}>
      <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${light ? "bg-white text-[#205448]" : "bg-[#205448] text-white"}`}>H</span>
      <span className={`font-bold tracking-tight ${light ? "text-white" : "text-[#20372f]"}`}>Helpdesk</span>
    </div>
  );
}

/** Provide the shared header and page frame for signed-in users. */
export function Workspace({ user, onLogout, onChangePassword, title, subtitle, children }: WorkspaceProps) {
  return (
    <main className="min-h-screen bg-[#f3f7f3]">
      <header className="sticky top-0 z-20 border-b border-[#dce7df] bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6 lg:px-8">
          <Brand />
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-full truncate text-sm font-semibold text-[#20372f]" title={user.name}>{user.name}</p>
            <p className="text-xs text-[#64786c]">{user.role === "admin" ? "Administrator" : "Customer"}</p>
          </div>
          <div className="col-span-2 flex w-full gap-2 sm:col-span-1 sm:w-auto">
            <Button variant="secondary" className="flex-1 whitespace-nowrap sm:flex-none" onClick={onChangePassword}>Change password</Button>
            <Button variant="secondary" className="flex-1 whitespace-nowrap sm:flex-none" onClick={onLogout}>Sign out</Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="mb-8">
          <p className="text-sm font-semibold text-[#64786c]">
            {user.role === "admin" ? "Admin workspace" : "Customer workspace"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#20372f] sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52685c]">{subtitle}</p>
        </section>
        {children}
      </div>
    </main>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirm a destructive action in a native modal dialog. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onCancel, onConfirm }: ConfirmDialogProps) {
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
      aria-labelledby="confirm-dialog-title"
      onClose={onCancel}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-md rounded-lg border border-[#dce7df] bg-white p-0 text-[#20372f] shadow-2xl backdrop:bg-[#142b24]/60"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#52685c]">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>Cancel</Button>
          <Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}