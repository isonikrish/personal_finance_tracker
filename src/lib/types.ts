import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type signupType = {
  email: string;
  password: string;
};

export type loginType = {
  email: string;
  password: string;
};

export type userType = {
  id: number;
  email: string;
  createdAt: string;
  accounts?: number;
};

export type AccountType = "CASH" | "BANK" | "OTHER";

export type TransactionType = "INCOME" | "EXPENSE";

export type CurrencyType = "INR" | "USD";

export type DashboardAccount = {
  id: number;
  name: string;
  type: AccountType;
  openingBalance: number;
  income: number;
  expenses: number;
  balance: number;
  transactionCount: number;
};

export type DashboardData = {
  msg: string;
  currency: CurrencyType;
  summary: {
    totalAccounts: number;
    totalOpeningBalance: number;
    totalIncome: number;
    totalExpenses: number;
    totalBalance: number;
  };
  accounts: DashboardAccount[];
};

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number | string;
  description: string;
  date: string;
  createdAt: string;
  dateIST: string;
  account: {
    id: number;
    name: string;
    type: AccountType;
  };
};

export type AddTransactionData = {
  accountId: number;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  time: string;
};
export type CreateAccountData = {
  name: string;
  type: AccountType;
  openingBalance: number;
};

export type useAuthStoreType = {
  user: userType | null;
  isUserLoading: boolean;

  signup: (data: signupType, router: AppRouterInstance) => Promise<void>;

  login: (data: loginType, router: AppRouterInstance) => Promise<void>;

  logout: (router: AppRouterInstance) => Promise<void>;

  getUser: () => Promise<void>;

  setUser: (user: userType | null) => void;
  setIsUserLoading: (value: boolean) => void;

  dashboardData: DashboardData | null;
  transactions: Transaction[];
  isDashboardLoading: boolean;
  isTransactionsLoading: boolean;

  fetchDashboard: () => Promise<boolean>;
  fetchTransactions: () => Promise<boolean>;

  addTransaction: (data: AddTransactionData) => Promise<boolean>;

  deleteTransaction: (id: number) => Promise<boolean>;

  createAccount: (data: CreateAccountData) => Promise<boolean>;
};
