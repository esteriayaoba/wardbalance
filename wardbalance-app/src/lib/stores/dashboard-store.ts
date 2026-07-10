import { create } from "zustand";

interface DashboardState {
  data: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  setData: (data: Record<string, unknown>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: true,
  error: null,
  setData: (data) => set({ data, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
