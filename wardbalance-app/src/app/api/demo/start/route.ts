import { NextResponse } from "next/server";
import { seedDemoSchool, DEMO_PASSWORD } from "@/lib/demo/seeder";

// Allow up to 60s for demo seeding (cold-start Neon DB + ~50 sequential queries)
export const maxDuration = 60;

export async function POST() {
  try {
    console.log("[demo/start] Starting demo seed...");
    await seedDemoSchool();
    console.log("[demo/start] Demo seed complete.");

    return NextResponse.json({
      redirectTo: "/admin/dashboard",
      email: "demo@wardbalance.local",
      password: DEMO_PASSWORD,
      isDemo: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[demo/start] Demo start error:", message, stack);
    return NextResponse.json(
      { error: "Failed to start demo", details: message },
      { status: 500 }
    );
  }
}
