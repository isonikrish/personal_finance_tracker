
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
  date: z.iso.datetime({ offset: true }).or(z.iso.date()),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json(
        { msg: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Parse JSON
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { msg: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 3. Validate input
    const validation = transactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          msg: "Invalid input",
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { accountId, type, amount, description, date } =
      validation.data;

    // 4. Validate amount for Decimal(12, 2)
    if (
      amount > 9_999_999_999.99 ||
      Math.round(amount * 100) / 100 !== amount
    ) {
      return NextResponse.json(
        {
          msg: "Amount must be positive, within the supported limit, and have at most 2 decimal places",
        },
        { status: 400 }
      );
    }

    // 5. Verify account ownership
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
        { status: 404 }
      );
    }

    // 6. Convert the provided date/time to an instant.
    // Date-only input means midnight IST on that date.
    const dateTime =
      /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? `${date}T00:00:00+05:30`
        : date;

    const transactionDate = new Date(dateTime);

    if (Number.isNaN(transactionDate.getTime())) {
      return NextResponse.json(
        { msg: "Invalid transaction date or time" },
        { status: 400 }
      );
    }

    // 7. Create transaction
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

    if(!transaction){
        return NextResponse.json({
            msg: "Failed to add transaction"
        })
    }
    // 8. Return transaction time formatted in IST
    return NextResponse.json(
      {
        msg: "Transaction added successfully",
      },
      { status: 201 }
    );
  } catch {

    return NextResponse.json(
      { msg: "Internal Server Error" },
      { status: 500 }
    );
  }
}
