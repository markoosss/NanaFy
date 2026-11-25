# NanaFy Web

The mobile-first web client and API for NanaFy.

On each sign-in, choose a profile, enter its password, then select mobile or computer for that session.

## Local development

1. Start the local database with Docker: `npx supabase start`.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the local Supabase status output. Never expose the service-role key to browser code or commit `.env.local`.
3. From this directory, install dependencies with `npm install` and run `npm run dev`.
4. Open `http://localhost:3000`; check `http://localhost:3000/api/health` for the API health response.

Use `npm test`, `npm run lint`, and `npm run build` to validate changes.

## Sign-in and app screens

Each visit starts with profile selection. An inactive profile enters its
single-use activation code and creates a password; an activated profile signs
in with its password. Every successful sign-in asks for mobile or computer
presentation before opening the dashboard.

The dashboard offers today's feeding, medication, and extra tasks; a dedicated
medication view; monthly veterinary and care events; shared notes; and the
completion history. Marcos also sees the administration screen for activation
codes and care schedules. Guest profiles can review the care plan, calendar,
and history and record completions, but cannot see notes or administration.

## First profile activation

After the local or hosted Supabase project has the migrations and seed applied, run `npm run auth:bootstrap-admin` once from this directory. The command creates a random, single-use activation code for Marcos, stores only its SHA-256 digest, and prints the raw code once. Share it privately and activate the profile within 24 hours. The API for Marcos to issue codes to other profiles is `POST /api/admin/activation-codes`; the dashboard administration screen will expose it.

## Shared care workflows

The browser uses the Next.js API routes for every shared read and write. The
Supabase service-role key stays on the server; each route checks the current
profile's permission before accessing the database.

| Route | Purpose | Access |
| --- | --- | --- |
| `GET /api/care/schedules?date=YYYY-MM-DD` | Daily feeding, medication, tasks and completion state | Family and guest |
| `POST`, `PATCH /api/admin/care-schedules` | Create or update care schedules | Marcos |
| `GET`, `POST /api/care/calendar` | Read shared appointments or add one | Read: family and guest; write: family |
| `GET`, `POST /api/care/notes` | Read or add household notes | Family |
| `POST /api/care/completions` | Complete one scheduled activity with an optional observation (up to 1000 characters) | Family and guest |
| `GET /api/care/history` | Review completion history for a date range | Family and guest |
| `POST /api/admin/activation-codes` | Issue a one-time profile activation code | Marcos |

Completion entries are separate from schedules. The database records the
activity date, authenticated profile, server timestamp, and an optional
observation shown on the daily plan and completion history. Unique indexes
prevent completing the same schedule twice on one date.

## Database map

Schema changes live in `../supabase/migrations/` and are applied in timestamp
order. The core tables are deliberately small and explicit:

- `profiles`, `activation_codes`, and `profile_sessions` hold profile
  identities, one-time activation digests, and session digests.
- `feeding_schedules`, `medication_schedules`,
  `medication_schedule_times`, and `care_tasks` hold planned routines.
- `calendar_events` and `notes` hold shared appointments and household notes.
- `care_completions` references exactly one feeding schedule, medication
  schedule, or task, plus the profile who completed it and an optional
  observation.

The server-only API uses the Supabase `service_role` key. The migration grants
that role the table privileges it needs while keeping those privileges off
public client roles; row-level security remains enabled on the tables.

Keep schema changes in a new migration rather than editing an already-applied
migration. Regenerate Supabase database types after changing the schema, and
review the generated function argument nullability against the SQL signatures.
