import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Authenticate user
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json({ msg: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. Fetch all accounts and their transactions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currency: true,
        accounts: {
          select: {
            id: true,
            name: true,
            type: true,
            openingBalance: true,
            transactions: {
              select: {
                type: true,
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ msg: "User not found" }, { status: 404 });
    }

    // 3. Calculate totals for each account
    const accounts = user.accounts.map((account) => {
      const income = account.transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = account.transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const openingBalance = Number(account.openingBalance);

      const balance = openingBalance + income - expenses;

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        openingBalance,
        income,
        expenses,
        balance,
        transactionCount: account.transactions.length,
      };
    });

    // 4. Calculate overall dashboard totals
    const totalOpeningBalance = accounts.reduce(
      (sum, account) => sum + account.openingBalance,
      0,
    );

    const totalIncome = accounts.reduce(
      (sum, account) => sum + account.income,
      0,
    );

    const totalExpenses = accounts.reduce(
      (sum, account) => sum + account.expenses,
      0,
    );

    const totalBalance = totalOpeningBalance + totalIncome - totalExpenses;
    // 5. Return dashboard data
    return NextResponse.json(
      {
        msg: "Dashboard data fetched successfully",
        currency: user.currency,
        summary: {
          totalAccounts: accounts.length,
          totalOpeningBalance,
          totalIncome,
          totalExpenses,
          totalBalance,
        },
        accounts,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
