import { useSyncExternalStore } from "react";
import { emptyFilters, type Filters } from "./analytics";

let state: Filters = { ...emptyFilters };
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((l) => l());

export function setFilters(next: Filters) {
  state = next;
  emit();
}
export function resetFilters() {
  setFilters({ ...emptyFilters });
}
export function useGlobalFilters(): Filters {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
