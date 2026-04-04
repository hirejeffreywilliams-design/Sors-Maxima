interface CircuitBreakerState {
  open: boolean;
  failures: number;
  lastFailure: number | null;
}

let state: CircuitBreakerState = { open: false, failures: 0, lastFailure: null };

export function getCircuitBreakerState(): CircuitBreakerState {
  return { ...state };
}

export function recordSuccess(): void {
  state = { open: false, failures: 0, lastFailure: null };
}

export function recordFailure(): void {
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= 5) {
    state.open = true;
  }
}

export function resetCircuitBreaker(): void {
  state = { open: false, failures: 0, lastFailure: null };
}
