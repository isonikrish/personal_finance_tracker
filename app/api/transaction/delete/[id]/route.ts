
import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate user
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json(
        { msg: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // 2. Get and validate transaction ID
    const { id } = await params;
    const validation = idSchema.safeParse(id);

    if (!validation.success) {
      return NextResponse.json(
        { msg: "Invalid transaction ID" },
        { status: 400 },
      );
    }

    const transactionId = validation.data;

    // 3. Find transaction belonging to this user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        account: {
          userId,
        },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { msg: "Transaction not found" },
        { status: 404 },
      );
    }

    // 4. Delete the transaction
    await prisma.transaction.delete({
      where: {
        id: transaction.id,
      },
    });

    // 5. Return success
    return NextResponse.json(
      {
        msg: "Transaction deleted successfully",
        deletedTransaction: transaction,
      },
      { status: 200 },
    );
  } catch{

    return NextResponse.json(
      { msg: "Internal Server Error" },
      { status: 500 },
    );
  }
}
