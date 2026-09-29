import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { getErrorMessage, request } from "../lib/api";
import { validateNewPassword } from "../lib/passwordRules";
import {
  Brand,
  Button,
  ErrorMessage,
  Field,
  Input,
} from "./ui";
import type { AuthResponse } from "../types";

interface AuthScreenProps {
  /** Called after registration or sign-in succeeds. */
  onAuthenticated: (data: AuthResponse) => void;
}

/** Render the sign-in and account-registration forms. */
export default function AuthScreen({
  onAuthenticated,
}: AuthScreenProps) {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  /** Keep form state aligned with the edited field. */
  function update(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /** Validate the form and send the selected authentication request. */
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isLogin && form.name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    
    if (!isLogin) {
      const passwordError = validateNewPassword(form.password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else if (!form.password || form.password.length > 72) {
      setError("Enter a password of up to 72 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await request<AuthResponse>(
        isLogin ? "/auth/login" : "/auth/register",
        {
          method: "POST",
          body: JSON.stringify(
            isLogin
              ? {
                  email: form.email.trim(),
                  password: form.password,
                }
              : {
                  name: form.name.trim(),
                  email: form.email.trim(),
                  password: form.password,
                }
          ),
        }
      );

      onAuthenticated(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  /** Switch between sign-in and account creation. */
  function switchMode() {
    setMode((current) =>
      current === "login" ? "register" : "login"
    );

    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f3f7f3]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Application overview */}
        <section className="hidden bg-[#183f35] p-12 text-white lg:flex lg:flex-col xl:p-20 justify-center">
          <div className="max-w-md mx-auto">
            {/* Desktop brand */}
            <div className="flex justify-center mb-8">
              <div className="[&>*]:scale-110">
                <Brand light />
              </div>
            </div>

            {/* Features */}
            <div className="mt-10 space-y-4">
              <div className="rounded-xl border border-[#477064] bg-[#245247]/70 p-4 transition-colors hover:bg-[#2a5d51]">
                <h2 className="font-semibold text-[#f0c27b]">
                  Ticket Management
                </h2>
                <p className="mt-1 text-sm text-[#c2d5c9]">
                  Create and manage support tickets efficiently.
                </p>
              </div>

              <div className="rounded-xl border border-[#477064] bg-[#245247]/70 p-4 transition-colors hover:bg-[#2a5d51]">
                <h2 className="font-semibold text-[#f0c27b]">
                  Status Tracking
                </h2>
                <p className="mt-1 text-sm text-[#c2d5c9]">
                  Monitor ticket priorities and resolution progress.
                </p>
              </div>

              <div className="rounded-xl border border-[#477064] bg-[#245247]/70 p-4 transition-colors hover:bg-[#2a5d51]">
                <h2 className="font-semibold text-[#f0c27b]">
                  Admin Dashboard
                </h2>
                <p className="mt-1 text-sm text-[#c2d5c9]">
                  View statistics and manage platform-wide support activity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-10 flex justify-center lg:hidden">
              <Brand mobile />
            </div>

            <div className="rounded-2xl border border-[#dce7df] bg-white p-7 shadow-sm sm:p-9">
              {/* Header */}
              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold text-[#b65e43]">
                  {isLogin
                    ? "Welcome back"
                    : "Create an account"}
                </p>

                <h2 className="text-2xl font-bold text-[#20372f]">
                  {isLogin
                    ? "Sign in to your workspace"
                    : "Create your account"}
                </h2>

                <p className="mt-2 text-sm text-[#64786c]">
                  {isLogin
                    ? "Enter your details to continue."
                    : "Enter your details to get started."}
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={submit}
                className="space-y-5"
              >
                {!isLogin && (
                  <Field label="Name">
                    <Input
                      name="name"
                      value={form.name}
                      onChange={update}
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                      placeholder="Your name"
                    />
                  </Field>
                )}

                <Field label="Email">
                  <Input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={update}
                    autoComplete="email"
                    maxLength={254}
                    required
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Password">
                  <Input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={update}
                    autoComplete={
                      isLogin
                        ? "current-password"
                        : "new-password"
                    }
                    minLength={isLogin ? undefined : 8}
                    maxLength={72}
                    required
                    placeholder={isLogin ? "Your password" : "At least 8 characters"}
                  />
                  {!isLogin && (
                    <span className="block text-xs text-[#64786c]">
                      Include uppercase and lowercase letters, a number, and a symbol.
                    </span>
                  )}
                </Field>

                {!isLogin && (
                  <Field label="Confirm password">
                    <Input
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={update}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      required
                      placeholder="Re-enter your password"
                    />
                  </Field>
                )}

                {error && (
                  <ErrorMessage>
                    {error}
                  </ErrorMessage>
                )}

                <Button
                  className="w-full"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : isLogin
                      ? "Sign in"
                      : "Create account"}
                </Button>
              </form>

              {/* Authentication mode */}
              <p className="mt-6 text-center text-sm text-[#64786c]">
                {isLogin
                  ? "New to Helpdesk?"
                  : "Already have an account?"}{" "}

                <button
                  type="button"
                  onClick={switchMode}
                  className="font-semibold text-[#b65e43] underline underline-offset-2 hover:text-[#944630]"
                >
                  {isLogin
                    ? "Create an account"
                    : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}