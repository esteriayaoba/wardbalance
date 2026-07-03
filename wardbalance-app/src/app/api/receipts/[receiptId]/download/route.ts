import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { formatNaira } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await props.params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { userId, role, schoolId } = session;

    // Fetch receipt with all related data
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, schoolId },
      include: {
        payment: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                admissionNumber: true,
                classLevel: { select: { name: true } },
                classArm: { select: { name: true } },
              },
            },
            parent: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
            invoice: {
              include: {
                term: {
                  include: {
                    session: true,
                  },
                },
                lineItems: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json(
        { error: "Receipt not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Role check: Parents can only see their own wards' receipts
    if (role === "Parent") {
      const link = await prisma.parentWardLink.findFirst({
        where: {
          parentId: userId,
          studentId: receipt.payment.studentId,
          schoolId,
        },
      });
      if (!link) {
        return NextResponse.json(
          { error: "Forbidden", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    } else {
      // Staff roles check
      const allowedRoles = ["SchoolOwner", "Principal", "Bursar", "Admin"];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: "Forbidden", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    }

    // Fetch school settings to retrieve bank details / addresses
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    // Generate PDF using pdfkit in a Promise wrapper
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // --- Design System Colors ---
      const PRIMARY_COLOR = "#155EEF"; // Primary Blue
      const TEXT_MAIN = "#1E293B";    // Slate 800
      const TEXT_MUTED = "#64748B";   // Slate 500
      const BORDER_COLOR = "#E2E8F0"; // Slate 200
      const BG_LIGHT = "#F8FAFC";     // Slate 50
      const SUCCESS_COLOR = "#16A34A"; // Green 600
      const WARNING_COLOR = "#D97706"; // Amber 600

      // --- Header section ---
      // Blue accent bar on the left
      doc.rect(40, 40, 6, 60).fill(PRIMARY_COLOR);

      doc.fillColor(TEXT_MAIN)
         .font("Helvetica-Bold")
         .fontSize(22)
         .text(school?.name || "School Workspace", 54, 42);

      doc.fontSize(10)
         .font("Helvetica")
         .fillColor(TEXT_MUTED)
         .text(school?.address || "", 54, 68, { width: 300 });

      doc.fillColor(PRIMARY_COLOR)
         .font("Helvetica-Bold")
         .fontSize(14)
         .text("PAYMENT RECEIPT", 400, 42, { align: "right" });

      doc.fontSize(12)
         .font("Helvetica-Bold")
         .fillColor(TEXT_MAIN)
         .text(receipt.receiptNumber, 400, 60, { align: "right" });

      doc.fontSize(9)
         .font("Helvetica")
         .fillColor(TEXT_MUTED)
         .text(
           `Date: ${new Date(receipt.createdAt).toLocaleDateString("en-NG", {
             year: "numeric",
             month: "long",
             day: "numeric",
           })}`,
           400,
           78,
           { align: "right" }
         );

      // Draw separator line
      doc.moveTo(40, 115).lineTo(555, 115).strokeColor(BORDER_COLOR).lineWidth(1).stroke();

      // --- Columns for Transaction Details vs Client Details ---
      let y = 130;

      // Left Column: Payment Info
      doc.fillColor(TEXT_MUTED).font("Helvetica-Bold").fontSize(10).text("TRANSACTION DETAILS", 40, y);
      doc.fillColor(TEXT_MAIN).font("Helvetica").fontSize(10);
      
      y += 18;
      doc.text("Payment Method:", 40, y).font("Helvetica-Bold").text(receipt.payment.method.toUpperCase().replace("_", " "), 150, y).font("Helvetica");
      y += 16;
      doc.text("Transaction Ref:", 40, y).font("Helvetica-Bold").text(receipt.payment.reference || "N/A", 150, y).font("Helvetica");
      y += 16;
      doc.text("Payment Date:", 40, y).font("Helvetica-Bold").text(new Date(receipt.payment.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" }), 150, y).font("Helvetica");
      y += 16;
      doc.text("Status:", 40, y).fillColor(SUCCESS_COLOR).font("Helvetica-Bold").text("SUCCESSFUL / VERIFIED", 150, y).font("Helvetica").fillColor(TEXT_MAIN);

      // Right Column: Student / Parent Info
      y = 130;
      doc.fillColor(TEXT_MUTED).font("Helvetica-Bold").fontSize(10).text("STUDENT & PARENT INFO", 320, y);
      doc.fillColor(TEXT_MAIN).font("Helvetica").fontSize(10);
      
      y += 18;
      doc.text("Student Name:", 320, y).font("Helvetica-Bold").text(`${receipt.payment.student.lastName}, ${receipt.payment.student.firstName}`, 410, y).font("Helvetica");
      y += 16;
      doc.text("Admission No:", 320, y).font("Helvetica-Bold").text(receipt.payment.student.admissionNumber, 410, y).font("Helvetica");
      y += 16;
      doc.text("Class:", 320, y).font("Helvetica-Bold").text(`${receipt.payment.student.classLevel.name} — ${receipt.payment.student.classArm.name}`, 410, y).font("Helvetica");
      y += 16;
      doc.text("Parent Name:", 320, y).font("Helvetica-Bold").text(receipt.payment.parent ? `${receipt.payment.parent.lastName}, ${receipt.payment.parent.firstName}` : "N/A", 410, y).font("Helvetica");

      // Draw separator line
      doc.moveTo(40, 220).lineTo(555, 220).strokeColor(BORDER_COLOR).stroke();

      // --- Academic Term Details Bar ---
      y = 235;
      doc.rect(40, y, 515, 30).fill(BG_LIGHT);
      doc.fillColor(TEXT_MAIN).font("Helvetica-Bold").fontSize(10).text("Academic Period:", 54, y + 10);
      doc.font("Helvetica").text(`${receipt.payment.invoice.term.session.name} — ${receipt.payment.invoice.term.name}`, 154, y + 10);

      // --- Invoice Line Items Table ---
      y = 285;
      doc.fillColor(TEXT_MUTED).font("Helvetica-Bold").fontSize(10).text("FEE COMPONENT BREAKDOWN", 40, y);

      // Header Row
      y += 18;
      doc.rect(40, y, 515, 20).fill(PRIMARY_COLOR);
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
      doc.text("Description", 54, y + 6);
      doc.text("Amount", 480, y + 6, { align: "right", width: 60 });

      // Rows
      const items = receipt.payment.invoice.lineItems || [];
      doc.fillColor(TEXT_MAIN).font("Helvetica").fontSize(9);

      let totalItemAmount = 0;
      for (const item of items) {
        y += 20;
        // Draw row background for alternating rows
        if (totalItemAmount % 2 === 0) {
          doc.rect(40, y, 515, 20).fill(BG_LIGHT);
        }
        doc.fillColor(TEXT_MAIN);
        doc.text(item.name, 54, y + 6);
        doc.text(formatNaira(item.amount.toString()), 480, y + 6, { align: "right", width: 60 });
        totalItemAmount++;
      }

      // Draw table bottom border
      y += 20;
      doc.moveTo(40, y).lineTo(555, y).strokeColor(BORDER_COLOR).stroke();

      // --- Totals & Financial Breakdown ---
      y += 15;
      doc.fillColor(TEXT_MUTED).font("Helvetica-Bold").fontSize(10).text("FINANCIAL SUMMARY", 40, y);

      y += 18;
      // Subtotal
      doc.fillColor(TEXT_MAIN).font("Helvetica").fontSize(9);
      doc.text("Invoice Subtotal (Original Amount):", 280, y);
      doc.font("Helvetica-Bold").text(formatNaira(receipt.payment.invoice.totalAmount.toString()), 450, y, { align: "right", width: 90 });

      y += 16;
      // Discount
      doc.font("Helvetica").text("Total Discounts Applied:", 280, y);
      doc.fillColor(SUCCESS_COLOR).font("Helvetica-Bold").text(`-${formatNaira(receipt.payment.invoice.discountAmount.toString())}`, 450, y, { align: "right", width: 90 });

      y += 16;
      // Invoice total (final amount)
      doc.fillColor(TEXT_MAIN).font("Helvetica").text("Final Invoice Amount Due:", 280, y);
      doc.font("Helvetica-Bold").text(formatNaira(receipt.payment.invoice.finalAmount.toString()), 450, y, { align: "right", width: 90 });

      y += 20;
      // Box for payment & balance due
      doc.rect(260, y, 295, 52).fill(BG_LIGHT);
      doc.rect(260, y, 295, 52).strokeColor(BORDER_COLOR).stroke();

      // Amount paid
      doc.fillColor(TEXT_MAIN).font("Helvetica-Bold").fontSize(10).text("AMOUNT PAID (THIS RECEIPT):", 270, y + 10);
      doc.fillColor(SUCCESS_COLOR).text(formatNaira(receipt.payment.amount.toString()), 450, y + 10, { align: "right", width: 90 });

      // Balance due
      const balanceDue = receipt.payment.invoice.balanceDue;
      doc.fillColor(TEXT_MAIN).font("Helvetica-Bold").text("REMAINING BALANCE DUE:", 270, y + 32);
      if (balanceDue.greaterThan(0)) {
        doc.fillColor(WARNING_COLOR).text(formatNaira(balanceDue.toString()), 450, y + 32, { align: "right", width: 90 });
      } else {
        doc.fillColor(SUCCESS_COLOR).text("₦0 (FULLY PAID)", 440, y + 32, { align: "right", width: 100 });
      }

      // --- Signatures and Footer ---
      y = 650;
      // Signature dotted line
      doc.moveTo(380, y).lineTo(520, y).strokeColor(TEXT_MUTED).stroke();
      doc.fillColor(TEXT_MUTED).font("Helvetica").fontSize(8).text("Authorized Signature / Bursar", 380, y + 6, { align: "center", width: 140 });

      // Verification Seal Box
      doc.rect(40, y - 20, 180, 45).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(SUCCESS_COLOR).font("Helvetica-Bold").fontSize(8).text("VERIFIED BY WARDBALANCE", 50, y - 10);
      doc.fillColor(TEXT_MUTED).font("Helvetica").fontSize(7).text(`ID: ${receipt.id}`, 50, y + 2, { width: 160 });

      // Footer notice
      doc.moveTo(40, 730).lineTo(555, 730).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(TEXT_MUTED)
         .font("Helvetica-Oblique")
         .fontSize(8)
         .text("This document is a certified proof of transaction generated electronically by WardBalance OS.", 40, 745, { align: "center", width: 515 });
      doc.text("WardBalance helps schools track who has paid, how much, and what is still owed. www.wardbalance.com", 40, 758, { align: "center", width: 515 });

      doc.end();
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Receipt_${receipt.receiptNumber}.pdf`,
      },
    });
  } catch (err: any) {
    console.error("[receipts/download] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
