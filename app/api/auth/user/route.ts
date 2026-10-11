import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getToken();
    if (!userId) {
      return NextResponse.json({ msg: "UNAUTHORIZED" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        _count: {
          select: {
            accounts: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ msg: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        accounts: user._count.accounts,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
