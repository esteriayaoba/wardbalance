import { NextRequest, NextResponse } from "next/server";
import { evaluateAllSchools } from "@/lib/lifecycle/engine";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await evaluateAllSchools();

    const triggered = results.filter((r) => r.enqueued);
    const errors = results.filter((r) => r.reason.startsWith("Error"));

    logInfo("lifecycle-cron", `Evaluated ${results.length} schools, triggered ${triggered.length}, errors ${errors.length}`);

    return NextResponse.json({
      evaluated: results.length,
      triggered: triggered.length,
      errors: errors.length,
      details: results.map((r) => ({ schoolId: r.schoolId, trigger: r.triggerFired, reason: r.reason })),
    });
  } catch (err) {
    logError("lifecycle-cron", err);
    return NextResponse.json(
      { error: "Lifecycle evaluation failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
