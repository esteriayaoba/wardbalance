import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const InitializePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "Parent") {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    const body = await request.json();
    const parsed = InitializePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { invoiceId, amount } = parsed.data;

    // Fetch invoice details and verify ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        schoolId,
        student: {
          parents: {
            some: { parentId },
          },
        },
      },
      include: {
        student: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found or unauthorized.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const txRef = `WB-${invoice.id}-${Date.now()}`;

    // If Flutterwave keys are set, make the actual API call (in Phase 2B).
    // For Phase 2A/3 scaffolding and offline demo capability, we fall back to a mock link.
    const flwSecretKey = process.env.FLW_SECRET_KEY;
    const isMockMode = !flwSecretKey || flwSecretKey === "mock";

    if (isMockMode) {
      const isProd = process.env.NODE_ENV === "production";
      if (isProd) {
        throw new Error("Payment gateway key missing in production config. Mock checkout is not allowed in production.");
      }

      // Generate a mock checkout page redirect URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const mockCheckoutUrl = `${appUrl}/parent/payments/status?status=completed&tx_ref=${txRef}&amount=${amount}&invoiceId=${invoiceId}&is_demo_checkout=true`;
      
      console.log(`[Flutterwave Mock] Payment initialized for Invoice ${invoiceId}:
        Ref: ${txRef}
        Amount: ₦${amount}
        Url: ${mockCheckoutUrl}`);

      return NextResponse.json({
        data: {
          link: mockCheckoutUrl,
          txRef,
          isMock: true,
        },
      });
    }

    // Real Flutterwave Integration (Scaffolded contract)
    const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flwSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amount,
        currency: "NGN",
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/payments/status`,
        customer: {
          email: session.email,
          name: session.fullName,
        },
        meta: {
          invoiceId: invoice.id,
          schoolId,
          parentId,
          studentId: invoice.studentId,
        },
        customizations: {
          title: "WardBalance School Fee Payment",
          description: `Fee payment for ${invoice.student.firstName} ${invoice.student.lastName}`,
        },
      }),
    });

    const flwBody = await flwResponse.json();

    if (!flwResponse.ok) {
      throw new Error(flwBody.message ?? "Flutterwave checkout initialization failed");
    }

    return NextResponse.json({
      data: {
        link: flwBody.data.link,
        txRef,
        isMock: false,
      },
    });
  } catch (err: any) {
    console.error("[payments/flutterwave/init] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to initialize payment gateway", code: "PAYMENT_INIT_FAILED" },
      { status: 500 }
    );
  }
}
