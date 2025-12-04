/**
 * API fetch utility that handles proxy routing and token refresh
 * This is a wrapper around fetch that routes requests through the Next.js API proxy
 */

// Shared promise to prevent concurrent token refreshes
let refreshPromise: Promise<string | null> | null = null;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> {
  const proxyPath = `/api/proxy?path=${encodeURIComponent(path)}`;

  const res = await fetch(proxyPath, {
    ...options,
    credentials: "include",
    cache: "no-store",
  });

  // If unauthorized and haven't retried yet, try refreshing token
  if (res.status === 401 && retryCount === 0) {
    // Use shared refresh promise to prevent concurrent refreshes
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            // Wait for cookie to propagate
            await new Promise((resolve) => setTimeout(resolve, 500));
            return data.accessToken || null;
          }
          return null;
        } finally {
          // Clear the promise after completion
          setTimeout(() => {
            refreshPromise = null;
          }, 1000);
        }
      })();
    }

    const newToken = await refreshPromise;

    // If refresh succeeded, retry the original request
    if (newToken) {
      // Add token directly to headers to bypass cookie caching
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set("X-Retry-Token", newToken);

      return apiFetch(
        path,
        { ...options, headers: retryHeaders },
        retryCount + 1
      );
    }
  }

  return res;
}
