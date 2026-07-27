import { NextResponse } from "next/server";
import { seedDemoSchool, DEMO_PASSWORD } from "@/lib/demo/seeder";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production", code: "NOT_AVAILABLE" }, { status: 404 });
  }

  try {
    await seedDemoSchool();

    return NextResponse.json({
      redirectTo: "/admin/dashboard",
      email: "demo@wardbalance.local",
      password: DEMO_PASSWORD,
      isDemo: true,
    });
  } catch {
    return NextResponse.json({ error: "Failed to start demo" }, { status: 500 });
  }
}
