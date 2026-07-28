# PostHog Data Warehouse — Setup Report

## Summary

No sources were created automatically this run. Both detected sources (PostgreSQL and Resend) require credentials that the user declined to provide interactively, so they have been handed off to the browser-based setup flow.

## Changes made to the project

No source code files were modified or created. This skill only connects external data sources — it does not edit application code.

## Sources to complete in the browser

### PostgreSQL

**Status:** Needs browser setup (credentials not provided)

Open the link below, enter your database credentials, and PostHog will begin syncing your Postgres tables into the data warehouse.

> **Important pre-flight notes:**
> - The host must be **publicly reachable** — `localhost`, `127.0.0.1`, and RFC-1918 private addresses (`10.x`, `172.16–31.x`, `192.168.x`) are rejected. PostHog connects from its own infrastructure.
> - If you use **Neon** or **Supabase**, make sure PostHog's egress IPs are allowlisted. Supabase users: use the **Session pooler** host (`aws-0-<region>.pooler.supabase.com`, port `6543`) and the username format `postgres.<project-ref>`.

**Setup URL:**
https://eu.i.posthog.com/project/214983/data-warehouse/new-source?kind=Postgres&utm_source=wizard&utm_campaign=warehouse-source

---

### Resend

**Status:** Needs browser setup (credentials not provided)

Open the link below and paste a **full-access** Resend API key. The key in your `.env` (`RESEND_API_KEY`) may be restricted to sending only. For warehouse import, create a key with full access (or at minimum read access to Audiences, Broadcasts, Contacts, Domains, and Emails) at [resend.com/api-keys](https://resend.com/api-keys).

**Setup URL:**
https://eu.i.posthog.com/project/214983/data-warehouse/new-source?kind=Resend&utm_source=wizard&utm_campaign=warehouse-source

---

## Manual steps

1. Open each setup URL above in your browser while logged in to PostHog.
2. Enter the requested credentials and confirm the connection.
3. Select the tables/resources you want to sync and choose a sync frequency.
4. PostHog will run an initial sync — depending on data volume this may take a few minutes to several hours.
5. Once synced, query your data in **Data warehouse → Query** or join it with product analytics events in Insights.
