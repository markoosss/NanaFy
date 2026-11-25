import { randomBytes, createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("profile_key, role, activated_at")
  .eq("profile_key", "marcos")
  .maybeSingle();

if (profileError) {
  throw new Error(`Could not read Marcos's profile: ${profileError.message}`);
}

if (!profile || profile.role !== "admin" || profile.activated_at) {
  throw new Error("Marcos's initial profile is missing or already activated.");
}

const { data: activeCode, error: activeCodeError } = await supabase
  .from("activation_codes")
  .select("id, expires_at")
  .eq("profile_key", "marcos")
  .is("used_at", null)
  .is("revoked_at", null)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (activeCodeError) {
  throw new Error(`Could not check existing setup codes: ${activeCodeError.message}`);
}

if (activeCode && Date.parse(activeCode.expires_at) > Date.now()) {
  throw new Error("A valid initial code already exists; use it or wait for expiry.");
}

if (activeCode) {
  const { error: revokeError } = await supabase
    .from("activation_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", activeCode.id)
    .is("used_at", null)
    .is("revoked_at", null);

  if (revokeError) {
    throw new Error(`Could not revoke the expired setup code: ${revokeError.message}`);
  }
}

const activationCode = randomBytes(24).toString("base64url");
const codeHash = createHash("sha256").update(activationCode).digest("hex");
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const { error: insertError } = await supabase.from("activation_codes").insert({
  profile_key: "marcos",
  code_hash: codeHash,
  expires_at: expiresAt,
  created_by: "marcos",
});

if (insertError) {
  throw new Error(`Could not create the initial setup code: ${insertError.message}`);
}

console.log(`Initial activation code for Marcos (expires ${expiresAt}):`);
console.log(activationCode);
console.log("Share this code privately. It will only be displayed once.");
