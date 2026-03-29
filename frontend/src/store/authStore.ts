import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {  User, Company  } from "../types";

interface AuthStore {
  token: string | null;
  user: User | null;
  company: Company | null;
  setAuth: (token: string, user: User, company: Company) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      company: null,
      setAuth: (token, user, company) => {
        localStorage.setItem("token", token);
        set({ token, user, company });
      },
      updateUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem("token");
        set({ token: null, user: null, company: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        company: state.company,
      }),
    }
  )
);
