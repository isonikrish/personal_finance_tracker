
import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Authenticate user
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json(
        { msg: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Fetch all transactions from the user's accounts
    const transactions = await prisma.transaction.findMany({
      where: {
        account: {
          userId,
        },
      },
      orderBy: [
        { date: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        createdAt: true,
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // 3. Return transactions
    return NextResponse.json(
      {
        msg: "Transactions fetched successfully",
        count: transactions.length,
        transactions: transactions.map((transaction) => ({
          ...transaction,
          dateIST: transaction.date.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
        })),
      },
      { status: 200 }
    );
  } catch {


    return NextResponse.json(
      { msg: "Internal Server Error" },
      { status: 500 }
    );
  }
}
