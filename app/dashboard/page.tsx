"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import useMain from "@/src/lib/useMain";
import { AccountType, TransactionType } from "@/src/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut } from "lucide-react";

function getTodayDate() {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function getCurrentTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export default function DashboardPage() {
  const router = useRouter();

  const user = useMain((state) => state.user);
  const getUser = useMain((state) => state.getUser);

  const dashboardData = useMain((state) => state.dashboardData);
  const transactions = useMain((state) => state.transactions);

  const isDashboardLoading = useMain(
    (state) => state.isDashboardLoading,
  );

  const isTransactionsLoading = useMain(
    (state) => state.isTransactionsLoading,
  );

  const fetchDashboard = useMain(
    (state) => state.fetchDashboard,
  );

  const fetchTransactions = useMain(
    (state) => state.fetchTransactions,
  );

  const addTransaction = useMain(
    (state) => state.addTransaction,
  );

  const deleteTransaction = useMain(
    (state) => state.deleteTransaction,
  );

  const createAccount = useMain(
    (state) => state.createAccount,
  );


  const logout = useMain((state) => state.logout);
  const isUserLoading = useMain((state) => state.isUserLoading);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAllTransactions, setShowAllTransactions] =
    useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] =
    useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] =
    useState(false);

  // Transaction form
  const [transactionAccountId, setTransactionAccountId] =
    useState("");

  const [transactionType, setTransactionType] =
    useState<TransactionType>("EXPENSE");

  const [transactionAmount, setTransactionAmount] =
    useState("");

  const [transactionDescription, setTransactionDescription] =
    useState("");

  const [transactionDate, setTransactionDate] = useState("");
  const [transactionTime, setTransactionTime] = useState("");
  // Account form
  const [accountName, setAccountName] = useState("");

  const [accountType, setAccountType] =
    useState<AccountType>("BANK");

  const [openingBalance, setOpeningBalance] = useState("0");

  const handleLogout = async () => {
    await logout(router);
  };
  useEffect(() => {
    setTransactionDate(getTodayDate());
    setTransactionTime(getCurrentTime());

  }, []);
  // Load user and dashboard data.
  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        await getUser();

        if (!isMounted) return;

        const currentUser = useMain.getState().user;

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        const loaded = await fetchDashboard();

        if (!isMounted || !loaded) return;

        const data = useMain.getState().dashboardData;

        if (!data || data.accounts.length === 0) {
          router.replace("/onboarding");
          return;
        }

        await fetchTransactions();
      } catch {
        toast.error("Unable to load your dashboard.");
      } finally {
        if (isMounted) {
          setIsPageLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [getUser, fetchDashboard, fetchTransactions, router]);

  // Select the first account automatically.
  useEffect(() => {
    if (
      dashboardData?.accounts.length &&
      !dashboardData.accounts.some(
        (account) => String(account.id) === transactionAccountId,
      )
    ) {
      setTransactionAccountId(
        String(dashboardData.accounts[0].id),
      );
    }
  }, [dashboardData, transactionAccountId]);

  const currency = dashboardData?.currency ?? "INR";

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  };

  // Add income or expense.
  const handleAddTransaction = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const amount = Number(transactionAmount);
    const accountId = Number(transactionAccountId);

    if (
      !Number.isInteger(accountId) ||
      !dashboardData?.accounts.some(
        (account) => account.id === accountId,
      )
    ) {
      toast.error("Please select a valid account.");
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 9_999_999_999.99 ||
      Math.round(amount * 100) / 100 !== amount
    ) {
      toast.error("Enter a valid amount with up to 2 decimals.");
      return;
    }

    if (!transactionDescription.trim()) {
      toast.error("Description is required.");
      return;
    }

    if (!transactionDate || !transactionTime) {
      toast.error("Please select both date and time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await addTransaction({
        accountId,
        type: transactionType,
        amount,
        description: transactionDescription.trim(),
        date: transactionDate,
        time: transactionTime,
      });

      if (!success) return;

      await Promise.all([
        fetchDashboard(),
        fetchTransactions(),
      ]);

      setTransactionAmount("");
      setTransactionDescription("");
      setTransactionDate(getTodayDate());
      setTransactionTime(getCurrentTime());
      setIsTransactionDialogOpen(false);

      toast.success("Transaction added successfully.");
    } catch {
      toast.error("Unable to add transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a transaction.
  const handleDeleteTransaction = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?",
    );

    if (!confirmed) return;

    try {
      const success = await deleteTransaction(id);

      if (!success) return;

      await Promise.all([
        fetchDashboard(),
        fetchTransactions(),
      ]);

      toast.success("Transaction deleted.");
    } catch {
      toast.error("Unable to delete transaction.");
    }
  };

  // Create another account.
  const handleCreateAccount = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const balance = Number(openingBalance);

    if (!accountName.trim()) {
      toast.error("Account name is required.");
      return;
    }

    if (
      !Number.isFinite(balance) ||
      balance < 0 ||
      balance > 9_999_999_999.99 ||
      Math.round(balance * 100) / 100 !== balance
    ) {
      toast.error("Enter a valid opening balance.");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await createAccount({
        name: accountName.trim(),
        type: accountType,
        openingBalance: balance,
      });

      if (!success) return;

      await fetchDashboard();

      setAccountName("");
      setAccountType("BANK");
      setOpeningBalance("0");
      setIsAccountDialogOpen(false);

      toast.success("Account created successfully.");
    } catch {
      toast.error("Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export PDF.
  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await axios.get("/api/export", {
        responseType: "blob",
      });

      const pdfBlob = new Blob([response.data], {
        type: "application/pdf",
      });

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "financial-statement.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(downloadUrl);

      toast.success("Financial statement downloaded.");
    } catch {
      toast.error("Unable to export your financial statement.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isPageLoading || isDashboardLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Loading your finances...
        </p>
      </main>
    );
  }

  if (!dashboardData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to load dashboard</CardTitle>
            <CardDescription>
              Check your connection and try again.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const visibleTransactions = showAllTransactions
    ? transactions
    : transactions.slice(0, 8);

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="mx-auto max-w-7xl space-y-5 p-3 pb-8 sm:space-y-6 sm:p-6 lg:p-8">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Finance Tracker
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back, {user?.email ?? "User"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsAccountDialogOpen(true)}>
              + Add account
            </Button>
            <Button onClick={() => setIsTransactionDialogOpen(true)}>
              + Add transaction
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting
                ? "Downloading..."
                : "Download Report"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              disabled={isUserLoading}
              aria-label="Logout"
              title="Logout"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>


        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <SummaryCard
            title="Total balance"
            value={formatCurrency(dashboardData.summary.totalBalance)}
            valueClass={
              dashboardData.summary.totalBalance < 0
                ? "text-red-600"
                : "text-green-600"
            }
            description="Across all accounts"
          />

          <SummaryCard
            title="Total income"
            value={formatCurrency(dashboardData.summary.totalIncome)}
            valueClass="text-green-600"
            description="Money received"
          />

          <SummaryCard
            title="Total expenses"
            value={formatCurrency(dashboardData.summary.totalExpenses)}
            valueClass="text-red-600"
            description="Money spent"
          />

          <SummaryCard
            title="Accounts"
            value={String(dashboardData.summary.totalAccounts)}
            description="Your active accounts"
          />
        </section>

        {/* Add transaction dialog */}
        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Add a transaction</DialogTitle>
              <DialogDescription>
                Record income or an expense for one of your accounts.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleAddTransaction}
              className="space-y-4"
            >
              {/* Income / Expense toggle */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={
                    transactionType === "EXPENSE"
                      ? "default"
                      : "outline"
                  }
                  className={
                    transactionType === "EXPENSE"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "border-red-200 text-red-600 hover:bg-red-50"
                  }
                  onClick={() => setTransactionType("EXPENSE")}
                >
                  − Expense
                </Button>

                <Button
                  type="button"
                  variant={
                    transactionType === "INCOME"
                      ? "default"
                      : "outline"
                  }
                  className={
                    transactionType === "INCOME"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "border-green-200 text-green-600 hover:bg-green-50"
                  }
                  onClick={() => setTransactionType("INCOME")}
                >
                  + Income
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Account</Label>

                  <Select
                    value={transactionAccountId}
                    onValueChange={(value) => {
                      setTransactionAccountId(value ?? "");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>

                    <SelectContent>
                      {dashboardData.accounts.map((account) => (
                        <SelectItem
                          key={account.id}
                          value={String(account.id)}
                        >
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionAmount">
                    Amount ({currency})
                  </Label>

                  <Input
                    id="transactionAmount"
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={transactionAmount}
                    onChange={(e) =>
                      setTransactionAmount(e.target.value)
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionDescription">
                    Description
                  </Label>

                  <Input
                    id="transactionDescription"
                    value={transactionDescription}
                    onChange={(e) =>
                      setTransactionDescription(e.target.value)
                    }
                    maxLength={500}
                    placeholder="e.g. Groceries"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionDate">Date</Label>

                  <Input
                    id="transactionDate"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionTime">Time (IST)</Label>

                  <Input
                    id="transactionTime"
                    type="time"
                    value={transactionTime}
                    onChange={(e) => setTransactionTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={
                  isSubmitting ||
                  dashboardData.accounts.length === 0
                }
              >
                {isSubmitting
                  ? "Saving..."
                  : `Save ${transactionType === "INCOME" ? "income" : "expense"}`}
              </Button>

              {dashboardData.accounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Create an account before adding transactions.
                </p>
              )}
            </form>
          </DialogContent>
        </Dialog>


        {/* Compact Accounts */}
        <section>


          <Card>
            {dashboardData.accounts.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsAccountDialogOpen(true)}
                className="w-full rounded-md border border-dashed py-3 text-xs text-muted-foreground hover:bg-muted/50"
              >
                + Create your first account
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dashboardData.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs">
                      {account.type === "BANK"
                        ? "▤"
                        : account.type === "CASH"
                          ? "◉"
                          : "◈"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">
                        {account.name}
                      </p>
                      <p
                        className={`truncate text-sm font-semibold tabular-nums ${account.balance < 0
                          ? "text-red-500"
                          : "text-foreground"
                          }`}
                      >
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </section>

        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create an account</DialogTitle>
              <DialogDescription>
                Set up an account to organize your money.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleCreateAccount}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="accountName">
                  Account name
                </Label>

                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) =>
                    setAccountName(e.target.value)
                  }
                  maxLength={100}
                  placeholder="e.g. Savings account"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Account type</Label>

                <Select
                  value={accountType}
                  onValueChange={(value) => {
                    if (
                      value === "CASH" ||
                      value === "BANK" ||
                      value === "OTHER"
                    ) {
                      setAccountType(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Account type" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openingBalance">
                  Opening balance ({currency})
                </Label>

                <Input
                  id="openingBalance"
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) =>
                    setOpeningBalance(e.target.value)
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Transactions */}
        <section>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  Your latest income and expenses.
                </CardDescription>
              </div>

              <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {transactions.length} total
              </span>
            </CardHeader>

            <CardContent>
              {isTransactionsLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Loading transactions...
                </p>
              ) : transactions.length === 0 ? (
                <EmptyState message="No transactions yet. Add your first transaction above." />
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {visibleTransactions.map((transaction) => {
                      const isIncome =
                        transaction.type === "INCOME";

                      return (
                        <div
                          key={transaction.id}
                          className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${isIncome
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            {isIncome ? "+" : "−"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium">
                              {transaction.description}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {transaction.account.name} ·{" "}
                              {transaction.dateIST ||
                                transaction.date}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <p
                              className={`max-w-full break-all text-right text-sm font-semibold tabular-nums ${isIncome
                                ? "text-green-600"
                                : "text-red-600"
                                }`}
                            >
                              {isIncome ? "+" : "−"}
                              {formatCurrency(transaction.amount)}
                            </p>

                            <button
                              type="button"
                              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
                              onClick={() =>
                                handleDeleteTransaction(
                                  transaction.id,
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {transactions.length > 8 && (
                    <Button
                      variant="outline"
                      className="mt-5 w-full"
                      onClick={() =>
                        setShowAllTransactions((previous) => !previous)
                      }
                    >
                      {showAllTransactions
                        ? "Show recent transactions"
                        : `View all ${transactions.length} transactions`}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>

      </div>
    </main>
  );
}


function SummaryCard({
  title,
  value,
  description,
  valueClass = "",
}: {
  title: string;
  value: string;
  description: string;
  valueClass?: string;
}) {
  return (
    <Card className="min-w-0 rounded-xl shadow-sm">
      <CardHeader className="space-y-1 p-3 pb-1.5 sm:p-4 sm:pb-2">
        <CardDescription className="truncate text-[11px] font-medium sm:text-sm">
          {title}
        </CardDescription>

        <CardTitle
          className={`break-all text-base font-bold leading-tight tracking-tight tabular-nums sm:text-xl lg:text-2xl ${valueClass}`}
        >
          {value}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}