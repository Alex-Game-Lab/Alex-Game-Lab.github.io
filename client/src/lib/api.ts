import { API } from "./content";
import { accessToken } from "../stores/auth";
import { ApiError } from "./errors";
export async function api<T = any>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    private?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const token = options.private ? await accessToken() : null;
  const response = await fetch(API + "/v1" + path, {
    method: options.method || "GET",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "omit",
    cache: "no-store",
    signal: options.signal || AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    throw new ApiError(
      typeof value.detail === "string" ? value.detail : "unavailable",
      response.status,
      value.request_id,
    );
  }
  return response.status === 204 ? ({} as T) : response.json();
}
