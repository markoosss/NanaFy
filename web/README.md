# NanaFy Web

The mobile-first web client and API for NanaFy.

## Local development

1. Start the local database with Docker: `npx supabase start`.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the local Supabase status output. Never expose the service-role key to browser code or commit `.env.local`.
3. From this directory, install dependencies with `npm install` and run `npm run dev`.
4. Open `http://localhost:3000`; check `http://localhost:3000/api/health` for the API health response.

Use `npm test`, `npm run lint`, and `npm run build` to validate changes.

## First profile activation

After the local or hosted Supabase project has the migrations and seed applied, run `npm run auth:bootstrap-admin` once from this directory. The command creates a random, single-use activation code for Marcos, stores only its SHA-256 digest, and prints the raw code once. Share it privately and activate the profile within 24 hours. The flow for issuing codes to other profiles will be added with the administration features.
