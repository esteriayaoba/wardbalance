import { NextResponse } from "next/server";
import { seedDemoSchool, DEMO_PASSWORD } from "@/lib/demo/seeder";

export async function POST() {
  try {
    await seedDemoSchool();

    return NextResponse.json({
      redirectTo: "/admin/dashboard",
      email: "demo@wardbalance.local",
      password: DEMO_PASSWORD,
      isDemo: true,
    });
  } catch (err) {
    console.error("[demo/start] Failed to start demo:", err);
    return NextResponse.json({ error: "Failed to start demo" }, { status: 500 });
  }
}
