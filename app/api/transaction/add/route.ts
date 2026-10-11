import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const transactionSchema = z.object({
  accountId: z.coerce.number().int().positive(),

  type: z.enum(["INCOME", "EXPENSE"]),

  amount: z.coerce.number().finite().positive(),

  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500),

  date: z.iso.date(),

  time: z.string().regex(
    /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    "Time must be in HH:mm format",
  ),
});

export async function POST(req: Request) {
  try {
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json(
        { msg: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { msg: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const validation = transactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          msg: "Invalid input",
          errors: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      accountId,
      type,
      amount,
      description,
      date,
      time,
    } = validation.data;

    // Enforce the supported amount limit and two decimal places.
    if (
      amount > 9_999_999_999.99 ||
      Math.round(amount * 100) / 100 !== amount
    ) {
      return NextResponse.json(
        {
          msg:
            "Amount must be positive, within the supported limit, " +
            "and have at most 2 decimal places",
        },
        { status: 400 },
      );
    }

    // Ensure the account belongs to the logged-in user.
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { msg: "Account not found" },
        { status: 404 },
      );
    }

    // Validate that the date is a real calendar date.
    const [year, month, day] = date.split("-").map(Number);

    const calendarDate = new Date(
      Date.UTC(year, month - 1, day),
    );

    const isValidDate =
      calendarDate.getUTCFullYear() === year &&
      calendarDate.getUTCMonth() === month - 1 &&
      calendarDate.getUTCDate() === day;

    if (!isValidDate) {
      return NextResponse.json(
        { msg: "Invalid transaction date" },
        { status: 400 },
      );
    }

    // Treat the selected date and time as Indian Standard Time.
    // Example: 2026-10-10 14:30 IST becomes
    // 2026-10-10T09:00:00.000Z internally.
    const transactionDate = new Date(
      `${date}T${time}:00+05:30`,
    );

    if (Number.isNaN(transactionDate.getTime())) {
      return NextResponse.json(
        { msg: "Invalid transaction date or time" },
        { status: 400 },
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: account.id,
        type,
        amount: amount.toFixed(2),
        description,
        date: transactionDate,
      },
      select: {
        id: true,
        accountId: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        msg: "Transaction added successfully",
        transaction: {
          ...transaction,
          amount: Number(transaction.amount),
          dateIST: transaction.date.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        },
      },
      { status: 201 },
    );
  } catch {

    return NextResponse.json(
      { msg: "Internal Server Error" },
      { status: 500 },
    );
  }
}