import { create } from "zustand";

interface FilterState {
  searchQuery: string;
  filterMethod: string;
  filterStatus: string;
  page: number;
  setSearchQuery: (query: string) => void;
  setFilterMethod: (method: string) => void;
  setFilterStatus: (status: string) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: "",
  filterMethod: "",
  filterStatus: "recorded",
  page: 1,
  setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
  setFilterMethod: (filterMethod) => set({ filterMethod, page: 1 }),
  setFilterStatus: (filterStatus) => set({ filterStatus, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set({ searchQuery: "", filterMethod: "", filterStatus: "recorded", page: 1 }),
}));
