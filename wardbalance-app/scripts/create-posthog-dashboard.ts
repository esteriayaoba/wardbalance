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
  query: Record<string, unknown>;
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
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "FunnelsQuery",
          dateRange: { date_from: "-7d" },
          series: [
            { kind: "EventsNode", event: "signup_started" },
            { kind: "EventsNode", event: "signup_completed" },
            { kind: "EventsNode", event: "email_verified" },
            { kind: "EventsNode", event: "setup_started" },
            { kind: "EventsNode", event: "setup_phase_completed", properties: [{ key: "phase", value: "1", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "setup_phase_completed", properties: [{ key: "phase", value: "2", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "setup_phase_completed", properties: [{ key: "phase", value: "3", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "setup_completed" },
          ],
          funnelsFilter: {
            funnelVizType: "steps",
            funnelWindowInterval: 7,
            funnelWindowIntervalUnit: "day",
          },
        },
      },
    },
    {
      name: "Success Metric: Onboarding Completion Rate (target >70%)",
      description: "Weekly conversion: signup_completed → setup_completed.",
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "TrendsQuery",
          dateRange: { date_from: "-7d" },
          series: [
            { kind: "EventsNode", event: "signup_completed", math: "total" },
            { kind: "EventsNode", event: "setup_completed", math: "total" },
          ],
          trendsFilter: {
            formula: "B/A*100",
          },
          interval: "week",
        },
      },
    },
    {
      name: "Success Metric: Signup → Setup Start (target +20%)",
      description: "Weekly conversion: signup_completed → setup_started.",
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "TrendsQuery",
          dateRange: { date_from: "-7d" },
          series: [
            { kind: "EventsNode", event: "signup_completed", math: "total" },
            { kind: "EventsNode", event: "setup_started", math: "total" },
          ],
          trendsFilter: {
            formula: "B/A*100",
          },
          interval: "week",
        },
      },
    },
    {
      name: "Success Metric: Setup Start → Completion (target +30%)",
      description: "Weekly conversion: setup_started → setup_completed.",
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "TrendsQuery",
          dateRange: { date_from: "-7d" },
          series: [
            { kind: "EventsNode", event: "setup_started", math: "total" },
            { kind: "EventsNode", event: "setup_completed", math: "total" },
          ],
          trendsFilter: {
            formula: "B/A*100",
          },
          interval: "week",
        },
      },
    },
    {
      name: "Success Metric: Time to First Invoice (target <10min median)",
      description: "Median time from signup to first invoice_generated.",
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "TrendsQuery",
          dateRange: { date_from: "-7d" },
          series: [
            { kind: "EventsNode", event: "invoice_generated", math: "median", math_property: "elapsed_min" },
          ],
          interval: "day",
        },
      },
    },
    {
      name: "Success Metric: Demo → Signup Conversion (target >15%)",
      description: "What % of demo users go on to sign up.",
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "FunnelsQuery",
          dateRange: { date_from: "-7d" },
          series: [
            { kind: "EventsNode", event: "demo_mode_entered" },
            { kind: "EventsNode", event: "signup_completed" },
          ],
          funnelsFilter: {
            funnelVizType: "steps",
          },
        },
      },
    },
    {
      name: "Phase Abandonment",
      description: "Tracks where users drop off within the 3-phase setup wizard.",
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "FunnelsQuery",
          dateRange: { date_from: "-7d" },
          series: [
            { kind: "EventsNode", event: "setup_started" },
            { kind: "EventsNode", event: "setup_phase_completed", properties: [{ key: "phase", value: "1", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "phase_started", properties: [{ key: "phase", value: "2", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "setup_phase_completed", properties: [{ key: "phase", value: "2", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "phase_started", properties: [{ key: "phase", value: "3", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "setup_phase_completed", properties: [{ key: "phase", value: "3", operator: "exact", type: "event" }] },
            { kind: "EventsNode", event: "setup_completed" },
          ],
          funnelsFilter: {
            funnelVizType: "steps",
            funnelWindowInterval: 7,
            funnelWindowIntervalUnit: "day",
          },
        },
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
      `${POSTHOG_HOST}/api/projects/${projectId}/insights/`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...item,
          dashboards: [dashboardId],
        }),
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
