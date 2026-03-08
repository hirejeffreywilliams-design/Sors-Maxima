import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { cacheApiResponse, CACHE_KEYS, getCachedResponse } from "@/hooks/use-offline-cache";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();

    // Cache specific keys for offline use
    const url = queryKey[0] as string;
    const isCacheable = Object.values(CACHE_KEYS).some(key => url.startsWith(key));
    if (isCacheable) {
      cacheApiResponse(url, data);
    }

    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (data stays "fresh" for 5 min)
      gcTime: 60 * 60 * 1000,   // 1 hour (keep in memory for 1h)
      retry: (failureCount, error) => {
        // Don't retry on auth errors, retry up to 2x on network errors
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      networkMode: "offlineFirst", // Use cached data when offline
    },
    mutations: {
      retry: false,
    },
  },
});
