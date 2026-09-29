/** Base URL used for requests to the backend API. */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/** Request options with an optional bearer token. */
export interface ApiRequestOptions extends RequestInit {
  token?: string;
}

/** Convert a request failure into a message suitable for the interface. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") return "Request cancelled.";
  if (error instanceof TypeError) return "Unable to reach the server. Check your connection and try again.";
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong. Please try again.";
}

/** Extract a useful message from an API error response. */
function getResponseError(response: Response, data: unknown): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const validationError = item as { loc?: unknown; msg?: unknown };
      if (typeof validationError.msg !== "string") return [];
      const location = Array.isArray(validationError.loc)
        ? validationError.loc.filter((part): part is string => typeof part === "string" && part !== "body").join(" ")
        : "";
      return [location ? `${location}: ${validationError.msg}` : validationError.msg];
    });
    if (messages.length) {
      const visibleMessages = messages.slice(0, 3);
      const remainingCount = messages.length - visibleMessages.length;
      if (remainingCount) visibleMessages.push(`${remainingCount} more validation error${remainingCount === 1 ? "" : "s"}`);
      return visibleMessages.join("; ");
    }
  }
  if (response.status >= 500) return "The server encountered an error. Please try again.";
  return `Request failed (${response.status}). Please check your details and try again.`;
}

/** Send a JSON request and return its response body. */
export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Unable to reach the server. Check your connection and try again.");
  }

  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getResponseError(response, data));
  }
  return data as T;
}

/** Format an API timestamp for display in the user's local timezone. */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}