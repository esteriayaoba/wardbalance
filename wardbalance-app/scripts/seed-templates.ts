import { CampaignTemplateService } from "../src/modules/growth/services/template.service";

async function run() {
  console.log("[seed] Seeding growth CRM templates...");
  try {
    await CampaignTemplateService.seedDefaultTemplates();
    console.log("[seed] ✓ Growth CRM templates seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("[seed] ✗ Failed to seed templates:", error);
    process.exit(1);
  }
}

run();
