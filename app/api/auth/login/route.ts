import { generateToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validatedReq = loginSchema.safeParse(data);
    if (!validatedReq.success) {
      return NextResponse.json({ msg: "Invalid Input" }, { status: 400 });
    }
    const { email, password } = validatedReq.data;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { msg: "Account with this email does not exist" },
        { status: 400 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { msg: "Password does not match" },
        { status: 400 },
      );
    }

    const response = NextResponse.json(
      {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      { status: 200 },
    );
    const res = await generateToken(user.id, response);
    return res;
  } catch {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
