import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { generateToken } from "@/src/lib/generateToken";
import bcrypt from "bcryptjs";
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validatedReq = signupSchema.safeParse(data);
    if (!validatedReq.success) {
      return NextResponse.json({ msg: "Invalid Input" }, { status: 400 });
    }

    const { email, password } = validatedReq.data;
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      return NextResponse.json(
        {
          msg: "Account with this email already exists.",
        },
        { status: 400 },
      );
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const createdUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    const response = NextResponse.json(
      {
        id: createdUser.id,
        email: createdUser.email,
        createdAt: createdUser.createdAt,
      },
      { status: 200 },
    );
    const res = await generateToken(createdUser.id, response);
    return res;
  } catch {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
