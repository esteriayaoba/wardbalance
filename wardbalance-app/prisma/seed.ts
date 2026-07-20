import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const PLANS = [
    {
      id: "starter_free",
      name: "Starter",
      tier: 0,
      price: 0,
      currency: "NGN",
      billingPeriod: null,
      features: {
        invoiceGeneration: true,
        manualPayments: true,
        studentManagement: true,
        parentPortal: true,
        basicReports: true,
        advancedReports: false,
        bulkInvoices: false,
        discountsAndActivities: false,
        apiAccess: false,
        prioritySupport: false,
      },
      limits: {
        maxStudents: 50,
        maxStaff: 1,
        maxWorkspaces: 1,
        paymentMethods: "manual",
        reports: "basic",
      },
      isActive: true,
      sortOrder: 0,
    },
    {
      id: "pro_term",
      name: "Pro",
      tier: 1,
      price: 20,
      currency: "NGN",
      billingPeriod: "term",
      features: {
        invoiceGeneration: true,
        manualPayments: true,
        studentManagement: true,
        parentPortal: true,
        basicReports: true,
        advancedReports: true,
        bulkInvoices: true,
        discountsAndActivities: true,
        apiAccess: false,
        prioritySupport: false,
      },
      limits: {
        maxStudents: 500,
        maxStaff: 5,
        maxWorkspaces: 1,
        paymentMethods: "all",
        reports: "advanced",
      },
      isActive: true,
      sortOrder: 1,
    },
    {
      id: "group_custom",
      name: "Group",
      tier: 2,
      price: 0,
      currency: "NGN",
      billingPeriod: null,
      features: {
        invoiceGeneration: true,
        manualPayments: true,
        studentManagement: true,
        parentPortal: true,
        basicReports: true,
        advancedReports: true,
        bulkInvoices: true,
        discountsAndActivities: true,
        apiAccess: true,
        prioritySupport: true,
      },
      limits: {
        maxStudents: -1,
        maxStaff: -1,
        maxWorkspaces: -1,
        paymentMethods: "all",
        reports: "advanced",
      },
      isActive: true,
      sortOrder: 2,
    },
  ];

  console.log("Seeding pricing plans...");

  for (const plan of PLANS) {
    await prisma.pricingPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    console.log(`  ✓ ${plan.name} (${plan.id})`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
