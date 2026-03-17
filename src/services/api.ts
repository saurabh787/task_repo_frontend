const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const apiFetch = async (
  path: string,
  options: RequestInit = {},
  accessToken?: string
) => {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || "Request failed";
    const error = new Error(message) as Error & { status?: number; payload?: unknown };
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
};

export const apiFetchWithAuth = async (path: string, options: RequestInit = {}) => {
  const accessToken = localStorage.getItem("accessToken") || undefined;
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    return await apiFetch(path, options, accessToken);
  } catch (err) {
    if (!refreshToken) {
      throw err;
    }
    if (err instanceof Error && (err as { status?: number }).status === 401) {
      try {
        const refreshData = await apiFetch("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken })
        });
        const newAccessToken = refreshData?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem("accessToken", newAccessToken);
          return apiFetch(path, options, newAccessToken);
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
    throw err;
  }
};
