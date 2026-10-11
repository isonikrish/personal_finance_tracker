import { getToken } from "@/src/lib/generateToken";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Authenticate user
    const userId = await getToken();

    if (!userId) {
      return NextResponse.json({ msg: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. Fetch only this user's accounts and transactions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        currency: true,
        accounts: {
          select: {
            id: true,
            name: true,
            type: true,
            openingBalance: true,
            transactions: {
              select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                date: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ msg: "User not found" }, { status: 404 });
    }

    // 3. Sort all transactions chronologically
    const transactions = user.accounts
      .flatMap((account) =>
        account.transactions.map((transaction) => ({
          ...transaction,
          accountName: account.name,
        })),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime() || a.id - b.id);

    // 4. Calculate totals
    const totalIncome = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalOpeningBalance = user.accounts.reduce(
      (sum, account) => sum + Number(account.openingBalance),
      0,
    );

    const closingBalance = totalOpeningBalance + totalIncome - totalExpenses;

    // 5. Create PDF
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: {
        top: 40,
        bottom: 40,
        left: 35,
        right: 35,
      },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];

    const pdfBuffer = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const currency = (value: number) =>
      `${user.currency} ${value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const formatDate = (date: Date) =>
      date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    // PDF uses INR/USD text rather than the rupee symbol
    // so the built-in font renders currency reliably.

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const tableWidth = right - left;

    const widths = [115, 85, 235, 105, 105];
    const scale = tableWidth / widths.reduce((a, b) => a + b, 0);
    const colWidths = widths.map((w) => w * scale);

    let y = 0;

    const drawTableHeader = () => {
      const headers = [
        "Date & Time (IST)",
        "Account",
        "Description",
        "Income",
        "Expense",
      ];

      doc.font("Helvetica-Bold").fontSize(9);

      let x = left;

      headers.forEach((header, index) => {
        doc.text(header, x + 4, y + 7, {
          width: colWidths[index] - 8,
          height: 25,
        });
        x += colWidths[index];
      });

      y += 30;
      doc.moveTo(left, y).lineTo(right, y).stroke();
      y += 5;
    };

    // 6. PDF title and summary
    doc.font("Helvetica-Bold").fontSize(20);
    doc.text("Financial Statement", left, 40);

    doc.font("Helvetica").fontSize(10);
    doc.text(`User: ${user.email}`, left, 70);
    doc.text(`Generated: ${formatDate(new Date())}`, left, 85);

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Account Summary", left, 115);

    let summaryY = 135;

    for (const account of user.accounts) {
      const income = account.transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = account.transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const balance = Number(account.openingBalance) + income - expenses;

      doc.font("Helvetica").fontSize(9);
      doc.text(
        `${account.name} (${account.type}) | Opening: ${currency(
          Number(account.openingBalance),
        )} | Income: ${currency(income)} | Expenses: ${currency(
          expenses,
        )} | Balance: ${currency(balance)}`,
        left,
        summaryY,
        { width: tableWidth },
      );

      summaryY += 16;
    }

    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(
      `Overall: Opening ${currency(
        totalOpeningBalance,
      )} | Income ${currency(totalIncome)} | Expenses ${currency(
        totalExpenses,
      )} | Closing Balance ${currency(closingBalance)}`,
      left,
      summaryY + 5,
      { width: tableWidth },
    );

    y = summaryY + 35;

    doc.font("Helvetica-Bold").fontSize(13);
    doc.text("Transaction History", left, y);
    y += 25;

    drawTableHeader();

    // 7. Draw transaction rows
    for (const transaction of transactions) {
      const income =
        transaction.type === "INCOME"
          ? currency(Number(transaction.amount))
          : "-";

      const expense =
        transaction.type === "EXPENSE"
          ? currency(Number(transaction.amount))
          : "-";

      const values = [
        formatDate(transaction.date),
        transaction.accountName,
        transaction.description,
        income,
        expense,
      ];

      doc.font("Helvetica").fontSize(8);

      const rowHeight = Math.max(
        25,
        ...values.map(
          (value, index) =>
            doc.heightOfString(value, {
              width: colWidths[index] - 8,
            }) + 10,
        ),
      );

      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 40;
        drawTableHeader();
      }

      let x = left;

      values.forEach((value, index) => {
        doc.text(value, x + 4, y + 5, {
          width: colWidths[index] - 8,
        });
        x += colWidths[index];
      });

      y += rowHeight;

      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(0.4)
        .strokeColor("#cccccc")
        .stroke();

      y += 3;
    }

    if (transactions.length === 0) {
      doc.font("Helvetica").fontSize(10);
      doc.text("No transactions found.", left, y + 5);
    }

    // 8. Add page numbers
    const range = doc.bufferedPageRange();

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);

      doc.font("Helvetica").fontSize(8);
      doc.text(`Page ${i + 1} of ${range.count}`, left, doc.page.height - 25, {
        width: tableWidth,
        align: "right",
      });
    }

    doc.end();

    const buffer = await pdfBuffer;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="financial-statement.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ msg: "Internal Server Error" }, { status: 500 });
  }
}
