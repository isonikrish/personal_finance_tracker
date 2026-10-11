
import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";
import {
  useAuthStoreType,
  userType,
  DashboardData,
  Transaction,
  AddTransactionData,
  CreateAccountData,
} from "@/src/lib/types";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const useMain = create<useAuthStoreType>((set) => ({
  user: null,
  isUserLoading: false,

  dashboardData: null,
  transactions: [],
  isDashboardLoading: false,
  isTransactionsLoading: false,

  signup: async (data, router) => {
    set({ isUserLoading: true });

    try {
      const res = await axios.post("/api/auth/signup", data);

      if (res.status === 200) {
        toast.success("Account created successfully");
        set({ user: res.data });
        router.replace("/onboarding");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Something went wrong. Please try again.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      set({ isUserLoading: false });
    }
  },

  login: async (data, router) => {
    set({ isUserLoading: true });

    try {
      const res = await axios.post("/api/auth/login", data);

      if (res.status === 200) {
        toast.success("You're now logged in.");
        set({ user: res.data });
        router.replace("/dashboard");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Something went wrong. Please try again.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      set({ isUserLoading: false });
    }
  },

  getUser: async () => {
    set({ isUserLoading: true });

    try {
      const res = await axios.get("/api/auth/user");

      set({
        user: res.data.user ?? res.data,
      });
    } catch {
      set({ user: null });
    } finally {
      set({ isUserLoading: false });
    }
  },

  logout: async (router: AppRouterInstance) => {
    set({ isUserLoading: true });

    try {
      const res = await axios.post("/api/auth/logout");

      if (res.status === 200) {
        set({
          user: null,
          dashboardData: null,
          transactions: [],
        });

        toast.success(res.data.msg || "Logged out successfully");
        router.replace("/login");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Something went wrong. Please try again.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      set({ isUserLoading: false });
    }
  },

  setUser: (user: userType | null) => set({ user }),

  setIsUserLoading: (value: boolean) =>
    set({ isUserLoading: value }),

  fetchDashboard: async () => {
    set({ isDashboardLoading: true });

    try {
      const res = await axios.get<DashboardData>("/api/auth/data");

      set({ dashboardData: res.data });

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Unable to load dashboard data.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }

      return false;
    } finally {
      set({ isDashboardLoading: false });
    }
  },

  fetchTransactions: async () => {
    set({ isTransactionsLoading: true });

    try {
      const res = await axios.get("/api/transaction/all-transactions");

      set({
        transactions: res.data.transactions as Transaction[],
      });

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Unable to load transactions.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }

      return false;
    } finally {
      set({ isTransactionsLoading: false });
    }
  },

  addTransaction: async (data: AddTransactionData) => {
    try {
      const res = await axios.post("/api/transaction/add", data);

      toast.success(
        res.data.msg || "Transaction added successfully.",
      );

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Unable to add transaction.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }

      return false;
    }
  },

  deleteTransaction: async (id: number) => {
    try {
      const res = await axios.delete(
        `/api/transaction/delete/${id}`,
      );

      toast.success(
        res.data.msg || "Transaction deleted successfully.",
      );

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Unable to delete transaction.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }

      return false;
    }
  },

  createAccount: async (data: CreateAccountData) => {
    try {
      const res = await axios.post("/api/account/create", data);

      toast.success(
        res.data.msg || "Account created successfully.",
      );

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.msg ||
            "Unable to create account.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }

      return false;
    }
  },
}));

export default useMain;
