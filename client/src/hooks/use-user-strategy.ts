import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getStrategy, type BettingStrategy } from "@/lib/strategy-definitions";

export interface UserStrategy {
  strategyId: string;
  strategyName: string;
  constraints: Record<string, any>;
  notes?: string;
  overrideCount: number;
  setAt: string;
  updatedAt: string;
}

export function useUserStrategy() {
  const { data, isLoading } = useQuery<UserStrategy | null>({
    queryKey: ["/api/user/strategy"],
    staleTime: 30000,
    retry: false,
  });

  const activeStrategy: BettingStrategy | null = data?.strategyId ? (getStrategy(data.strategyId) ?? null) : null;
  const isActiveMode = () => !!data?.constraints?.activeMode;

  const setStrategy = useMutation({
    mutationFn: (s: { strategyId: string; strategyName: string; constraints?: Record<string, any>; notes?: string }) =>
      apiRequest("PUT", "/api/user/strategy", s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/strategy"] });
    },
  });

  const clearStrategy = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/user/strategy"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/strategy"] });
    },
  });

  const recordOverride = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/strategy/override"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/strategy"] });
    },
  });

  return {
    userStrategy: data ?? null,
    activeStrategy,
    isActiveMode,
    isLoading,
    setStrategy,
    clearStrategy,
    recordOverride,
  };
}
