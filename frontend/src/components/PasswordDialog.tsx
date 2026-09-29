import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { getErrorMessage, request } from "../lib/api";
import { validateNewPassword } from "../lib/passwordRules";
import { Button, ErrorMessage, Field, Input } from "./ui";

/** Session and visibility controls for the password dialog. */
interface PasswordDialogProps {
  open: boolean;
  token: string;
  onClose: () => void;
}

/** Verify the current password before submitting a replacement. */
export function PasswordDialog({ open, token, onClose }: PasswordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /** Clear entered passwords and close the dialog. */
  function close() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    dialogRef.current?.close();
    onClose();
  }

  /** Validate the new password and send the account update. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current one.");
      return;
    }

    setSaving(true);
    try {
      await request<void>("/users/me/password", {
        token,
        method: "PATCH",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      close();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="password-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-md rounded-lg border border-[#dce7df] bg-white p-0 text-[#20372f] shadow-2xl backdrop:bg-[#142b24]/60"
    >
      <form onSubmit={submit} className="space-y-5 p-6">
        <div>
          <h2 id="password-dialog-title" className="text-lg font-bold">Change password</h2>
          <p className="mt-1 text-sm text-[#64786c]">Verify your current password and choose a new one.</p>
        </div>
        <Field label="Current password">
          <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" maxLength={72} required />
        </Field>
        <Field label="New password">
          <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required />
          <span className="block text-xs text-[#64786c]">Use 8 to 72 characters with uppercase and lowercase letters, a number, and a symbol.</span>
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required />
        </Field>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Update password"}</Button>
        </div>
      </form>
    </dialog>
  );
}