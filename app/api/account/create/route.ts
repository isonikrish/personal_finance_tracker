import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(100),
  type: z.enum(["CASH", "BANK", "OTHER"]),
  openingBalance: z.coerce
    .number()
    .finite()
    .min(0, "Opening balance cannot be negative")
    .max(9999999999.99, "Opening balance is too large")
    .refine(
      (value) => Math.round(value * 100) === value * 100,
      "Opening balance can have at most 2 decimal places",
    )
    .default(0),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json({ msg: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. Validate request body
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ msg: "Invalid JSON body" }, { status: 400 });
    }

    const validation = accountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          msg: "Invalid account details",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, type, openingBalance } = validation.data;

    // 3. Check for an existing account with the same name
    const existingAccount = await prisma.account.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
      select: { id: true },
    });

    if (existingAccount) {
      return NextResponse.json(
        { msg: "An account with this name already exists" },
        { status: 409 },
      );
    }

    // 4. Create account
    const account = await prisma.account.create({
      data: {
        name,
        type,
        openingBalance,
        userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        openingBalance: true,
        createdAt: true,
      },
    });

    // 5. Return created account
    return NextResponse.json(
      {
        msg: "Account created successfully",
        account: {
          ...account,
          openingBalance: Number(account.openingBalance),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
