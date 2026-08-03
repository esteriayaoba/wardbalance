import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ResendEmailDispatcher } from "@/modules/growth/dispatchers/resend-email.dispatcher";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json({ error: "Test email recipient is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Mock replacements for test email
    const replacements = {
      firstName: "TestAdmin",
      schoolName: "Test WardBalance Academy",
      unsubscribe: "https://wardbalance.com/unsubscribe?email=test@example.com",
    };

    let subject = campaign.subject;
    let htmlBody = campaign.htmlBody;
    
    // Simple mock replacement
    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replaceAll(`{{${key}}}`, value);
      htmlBody = htmlBody.replaceAll(`{{${key}}}`, value);
    }

    const dispatcher = new ResendEmailDispatcher();
    const result = await dispatcher.send({
      recipientId: "test-recipient",
      recipientContact: testEmail,
      firstName: "TestAdmin",
      subject: `[TEST] ${subject}`,
      htmlBody,
      idempotencyKey: `test-campaign-send-${campaign.id}-${testEmail}-${Date.now()}`,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send test email", code: "PROVIDER_ERROR" }, { status: 500 });
    }

    return NextResponse.json({ message: `Test email successfully sent to ${testEmail}` });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to send test email", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
