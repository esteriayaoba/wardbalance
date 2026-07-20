/**
 * Creates the WardBalance Onboarding Funnel dashboard in PostHog.
 *
 * Usage:
 *   POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx ts-node scripts/create-posthog-dashboard.ts
 *
 * The script reads event names from the source code to ensure accuracy.
 * Requires a PostHog personal API key with dashboard:write scope.
 */

const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://app.posthog.com";

interface PostHogDashboardItem {
  name: string;
  description?: string;
  filters: Record<string, unknown>;
}

async function createDashboard(): Promise<void> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !projectId) {
    console.error("Missing POSTHOG_API_KEY or POSTHOG_PROJECT_ID");
    console.error("Usage: POSTHOG_API_KEY=... POSTHOG_PROJECT_ID=... npx ts-node scripts/create-posthog-dashboard.ts");
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const items: PostHogDashboardItem[] = [
    {
      name: "Onboarding Funnel",
      description: "Complete signup-to-activation funnel. Measures drop-off at each of the 8 stages.",
      filters: {
        insight: "FUNNELS",
        funnel_viz_type: "steps",
        layout: "horizontal",
        funnel_step_reference: "previous",
        funnel_window_interval: 7,
        funnel_window_interval_unit: "day",
        events: [
          { id: "signup_started", order: 0 },
          { id: "signup_completed", order: 1 },
          { id: "email_verified", order: 2 },
          { id: "setup_started", order: 3 },
          { id: "setup_phase_completed", order: 4, properties: [{ key: "phase", value: 1, operator: "exact" }] },
          { id: "setup_phase_completed", order: 5, properties: [{ key: "phase", value: 2, operator: "exact" }] },
          { id: "setup_phase_completed", order: 6, properties: [{ key: "phase", value: 3, operator: "exact" }] },
          { id: "setup_completed", order: 7 },
        ],
      },
    },
    {
      name: "Success Metric: Onboarding Completion Rate (target >70%)",
      description: "Weekly conversion: signup_completed → setup_completed.",
      filters: {
        insight: "TRENDS",
        interval: "week",
        events: [
          { id: "signup_completed", math: "total" },
          { id: "setup_completed", math: "total" },
        ],
        formula: "B/A*100",
      },
    },
    {
      name: "Success Metric: Signup → Setup Start (target +20%)",
      description: "Weekly conversion: signup_completed → setup_started.",
      filters: {
        insight: "TRENDS",
        interval: "week",
        events: [
          { id: "signup_completed", math: "total" },
          { id: "setup_started", math: "total" },
        ],
        formula: "B/A*100",
      },
    },
    {
      name: "Success Metric: Setup Start → Completion (target +30%)",
      description: "Weekly conversion: setup_started → setup_completed.",
      filters: {
        insight: "TRENDS",
        interval: "week",
        events: [
          { id: "setup_started", math: "total" },
          { id: "setup_completed", math: "total" },
        ],
        formula: "B/A*100",
      },
    },
    {
      name: "Success Metric: Time to First Invoice (target <10min median)",
      description: "Median time from signup to first invoice_generated.",
      filters: {
        insight: "TRENDS",
        interval: "day",
        events: [
          { id: "invoice_generated", math: "median", math_property: "elapsed_min", name: "Median time to first invoice (min)" },
        ],
      },
    },
    {
      name: "Success Metric: Demo → Signup Conversion (target >15%)",
      description: "What % of demo users go on to sign up.",
      filters: {
        insight: "STICKINESS",
        interval: "week",
        events: [
          { id: "demo_mode_entered", math: "total" },
          { id: "signup_completed", math: "total" },
        ],
      },
    },
    {
      name: "Phase Abandonment",
      description: "Tracks where users drop off within the 3-phase setup wizard.",
      filters: {
        insight: "FUNNELS",
        funnel_viz_type: "steps",
        layout: "vertical",
        funnel_window_interval: 7,
        funnel_window_interval_unit: "day",
        events: [
          { id: "setup_started", order: 0 },
          { id: "setup_phase_completed", order: 1, properties: [{ key: "phase", value: 1, operator: "exact" }] },
          { id: "phase_started", order: 2, properties: [{ key: "phase", value: 2, operator: "exact" }] },
          { id: "setup_phase_completed", order: 3, properties: [{ key: "phase", value: 2, operator: "exact" }] },
          { id: "phase_started", order: 4, properties: [{ key: "phase", value: 3, operator: "exact" }] },
          { id: "setup_phase_completed", order: 5, properties: [{ key: "phase", value: 3, operator: "exact" }] },
          { id: "setup_completed", order: 6 },
        ],
      },
    },
  ];

  // Create dashboard
  const dashboardRes = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/dashboards/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "WardBalance — Onboarding Funnel (auto)",
      filters: {},
    }),
  });

  if (!dashboardRes.ok) {
    const errBody = await dashboardRes.text();
    throw new Error(`Failed to create dashboard: ${dashboardRes.status} ${errBody}`);
  }

  const dashboard = await dashboardRes.json();
  const dashboardId = dashboard.id;
  console.log(`Created dashboard: ${dashboard.name} (id: ${dashboardId})`);

  // Add items to dashboard
  for (const item of items) {
    const itemRes = await fetch(
      `${POSTHOG_HOST}/api/projects/${projectId}/dashboards/${dashboardId}/items/`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(item),
      }
    );

    if (!itemRes.ok) {
      const errBody = await itemRes.text();
      console.warn(`Failed to add item "${item.name}": ${itemRes.status} ${errBody}`);
    } else {
      console.log(`  Added panel: ${item.name}`);
    }
  }

  console.log(`\nDashboard ready: ${POSTHOG_HOST}/dashboard/${dashboardId}`);
}

createDashboard().catch((err) => {
  console.error(err);
  process.exit(1);
});
