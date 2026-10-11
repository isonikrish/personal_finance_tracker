import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const onboardingSchema = z.object({
  accountName: z.string().trim().min(1, "Account name is required"),
  accountType: z.enum(["CASH", "BANK", "OTHER"]),
  openingBalance: z.coerce.number().finite().nonnegative(),
});

export async function POST(req: Request) {
  try {
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json({ msg: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const validation = onboardingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          msg: "Invalid input",
          errors: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { accountName, accountType, openingBalance } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ msg: "User not found" }, { status: 404 });
    }

    if (user._count.accounts >= 1) {
      return NextResponse.json(
        { msg: "You are already onboarded" },
        { status: 409 },
      );
    }

    const existingAccount = await prisma.account.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: accountName,
        },
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { msg: "An account with this name already exists" },
        { status: 409 },
      );
    }

    const account = await prisma.account.create({
      data: {
        name: accountName,
        type: accountType,
        openingBalance,
        userId: user.id,
      },
    });

    if (!account) {
      return NextResponse.json({
        msg: "Failed to create account",
      });
    }
    return NextResponse.json(
      {
        msg: "Onboarding completed successfully",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
