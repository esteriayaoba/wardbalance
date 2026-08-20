import { NextRequest, NextResponse } from "next/server";
import { processOverdueInvoices } from "@/lib/invoices/overdue";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    const isAuthorized =
      process.env.NODE_ENV !== "production" ||
      (Boolean(expectedSecret) &&
        (cronHeader === expectedSecret || authHeader === `Bearer ${expectedSecret}`));

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processOverdueInvoices();

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    logError("cron-overdue", err);
    return NextResponse.json(
      { error: "Internal Cron Error", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
