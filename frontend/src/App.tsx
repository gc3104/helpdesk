import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import { Loading } from "./components/ui";
import { request } from "./lib/api";
import { AdminDashboard, UserDashboard } from "./Dashboard";
import type { AuthResponse, Session, User } from "./types";

/** Restore the current tab's session and render the matching workspace. */
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(sessionStorage.getItem("helpdesk_token")));

  useEffect(() => {
    const token = sessionStorage.getItem("helpdesk_token");
    if (!token) return;

    request<User>("/users/me", { token })
      .then((user) => setSession({ token, user }))
      .catch(() => sessionStorage.removeItem("helpdesk_token"))
      .finally(() => setCheckingSession(false));
  }, []);

  /** Save a successful sign-in and load the appropriate dashboard. */
  function authenticate(data: AuthResponse) {
    sessionStorage.setItem("helpdesk_token", data.access_token);
    setSession({ token: data.access_token, user: data.user });
  }

  /** Clear the current tab's session. */
  function logout() {
    sessionStorage.removeItem("helpdesk_token");
    setSession(null);
  }

  if (checkingSession) return <Loading text="Checking session..." />;
  if (!session) return <AuthScreen onAuthenticated={authenticate} />;
  if (session.user.role === "admin") {
    return <AdminDashboard {...session} onLogout={logout} />;
  }
  return <UserDashboard {...session} onLogout={logout} />;
}

export default App;