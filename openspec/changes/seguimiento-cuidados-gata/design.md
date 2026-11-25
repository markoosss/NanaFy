# Design

## Context

See `proposal.md` for the motivation and `specs/cat-care-management/spec.md` for observable behavior. The workspace currently contains no application code or existing database. The app must keep one shared history available to multiple authenticated profiles on mobile and PC.

## Goals / Non-Goals

**Goals:**
- Keep the data model small, relational, and easy to understand in the project.
- Support shared updates, per-profile attribution, and Marcos-only administration.
- Make the mobile-first UI usable on desktop while honoring the device choice made at each login.
- Allow Marcos to change routine settings through the app, with initial defaults and schema changes understandable in code.

**Non-Goals:**
- Offline-first operation or synchronization of independent device databases.
- Automatic reminders, push notifications, veterinary integrations, or medical advice.
- Choosing a hosting provider or visual design system before implementation.

## Decisions

### Use Vercel and Supabase for the shared web app

Use Vercel Functions for server-side API routes and Supabase PostgreSQL for shared data. Vercel supports server-side functions, and Supabase provides a full PostgreSQL database with both dashboard and SQL access. This keeps the app's relational schema inspectable while making records available across devices. Use the providers' default HTTPS domains for development and previews; decide on a custom domain before production publication.

Supabase documents daily automatic backups for Pro, Team, and Enterprise plans. For lower-cost development, use explicit database exports and verify restoration; choose the production plan with Marcos before relying on automatic backups.

### Keep the data model explicit

Use a small set of named tables with clear foreign keys: `profiles`, `activation_codes`, `profile_sessions`, `feeding_schedules`, `medication_schedules`, `care_tasks`, `calendar_events`, `notes`, and `care_completions`. Completion records reference the profile that performed the activity and store its completion time. Use schema migrations to make database changes reviewable.

The database is the source of truth for live data. Include the five initial profiles as non-secret seed data, but do not let routine seed runs overwrite values changed in the app. Marcos manages profiles and care settings through the admin UI; code-level defaults and schema changes remain visible in the project for maintainers.

### Enforce authentication and permissions in the API

Store password hashes, never plaintext passwords. Marcos creates one-time activation codes for profiles; each code is stored in a non-reversible form and can activate only its intended profile once. The API checks profile permissions for every administrative or care-record operation; hiding controls in the web client is not sufficient authorization.

Generate Marcos's initial activation code with a private local setup command that stores only its hash and displays the raw code once. After Marcos activates the account, he creates the other profile codes from the admin UI. Store only hashes of opaque, revocable session tokens in the database; send the raw token only in an HTTP-only, same-site cookie.

### Make device choice a presentation preference for that login

The flow is profile selection, password verification, mobile/PC choice, then the app. Ask again on every login as requested. The choice selects the initial navigation and presentation density, while responsive layout rules still accommodate a window whose size differs from the selected device.

### Separate planned care from completed care

Keep feeding and medication schedules and extra care tasks as editable plans. Store each completion as a separate history record instead of overwriting the plan. This preserves who did what and when while letting Marcos update future schedules without losing past records.

## Risks / Trade-offs

- [The shared app is unavailable when its hosting or network is unavailable] -> Use routine database backups and clear service errors; offline synchronization is not part of this design.
- [A leaked activation code could let someone claim a profile] -> Make codes single-use, profile-specific, and revocable; distribute them privately.
- [A client-side-only permission check could expose administration to Invitado] -> Enforce authorization in the API and test denied operations.
- [Code defaults and live database edits could drift] -> Treat the database as the runtime source of truth and use seeds only for initial setup, not repeated overwrites.

## Migration Plan

There is no existing application data to migrate. Create the schema and initial profiles through versioned migrations and seed setup, deploy the API and web client, then verify activation, permissions, cross-device updates, and completion history. Before later schema releases, back up the database; roll back the application version first and restore a backup only if a schema change cannot be reversed safely.

## Open Questions

- Should production use a custom domain, and which Supabase plan is appropriate for the household's backup needs and budget?
