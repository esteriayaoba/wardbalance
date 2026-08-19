import { NextResponse } from "next/server";
import { seedDemoSchool, DEMO_PASSWORD } from "@/lib/demo/seeder";

export async function POST() {
  // Removed NODE_ENV check to allow demo access in production

  try {
    await seedDemoSchool();

    return NextResponse.json({
      redirectTo: "/admin/dashboard",
      email: "demo@wardbalance.local",
      password: DEMO_PASSWORD,
      isDemo: true,
    });
  } catch (error: any) {
    console.error("Demo start error:", error);
    return NextResponse.json({ error: "Failed to start demo", details: error.message }, { status: 500 });
  }
}
