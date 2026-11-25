create or replace function public.issue_activation_code(
  p_profile_key text,
  p_code_hash text,
  p_created_by text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_created_by <> 'marcos'
    or p_profile_key = 'marcos'
    or p_expires_at <= pg_catalog.now()
  then
    return false;
  end if;

  perform 1
  from public.profiles
  where profile_key = p_profile_key
    and activated_at is null
  for update;

  if not found then
    return false;
  end if;

  update public.activation_codes
  set revoked_at = pg_catalog.now()
  where profile_key = p_profile_key
    and used_at is null
    and revoked_at is null;

  insert into public.activation_codes (
    profile_key,
    code_hash,
    expires_at,
    created_by
  )
  values (
    p_profile_key,
    p_code_hash,
    p_expires_at,
    p_created_by
  );

  return true;
end;
$$;

revoke all on function public.issue_activation_code(text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.issue_activation_code(text, text, text, timestamptz)
  to service_role;
