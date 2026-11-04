import { useEffect, useSyncExternalStore } from "react";

export type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

/* A tiny shared cache backed by an API loader. Every component that calls
   `useResource` sees the same data, and any mutation can `reload()` it. */

export function createResourceStore<T>(loader: () => Promise<T>, initial: T) {
  let state: ResourceState<T> = { data: initial, loading: true, error: null };
  let started = false;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => state;

  async function reload() {
    try {
      const data = await loader();
      state = { data, loading: false, error: null };
    } catch (error) {
      state = {
        data: state.data,
        loading: false,
        error:
          error instanceof Error ? error.message : "Unable to load data",
      };
    }
    notify();
  }

  function useResource() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot);

    useEffect(() => {
      if (!started) {
        started = true;
        void reload();
      }
    }, []);

    return snapshot;
  }

  return { useResource, reload };
}
