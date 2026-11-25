alter table public.profiles
  add constraint profiles_password_hash_format
  check (
    password_hash is null
    or password_hash ~ '^scrypt[$][A-Za-z0-9_-]+[$][A-Za-z0-9_-]+$'
  );

create table public.profile_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.profiles (profile_key)
    on delete cascade,
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index profile_sessions_by_profile
  on public.profile_sessions (profile_key, expires_at)
  where revoked_at is null;

alter table public.profile_sessions enable row level security;

create or replace function public.activate_profile(
  p_profile_key text,
  p_code_hash text,
  p_password_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.activation_codes
  set used_at = pg_catalog.now()
  where profile_key = p_profile_key
    and code_hash = p_code_hash
    and used_at is null
    and revoked_at is null
    and expires_at > pg_catalog.now();

  if not found then
    return false;
  end if;

  update public.profiles
  set password_hash = p_password_hash,
      activated_at = pg_catalog.now()
  where profile_key = p_profile_key
    and activated_at is null
    and password_hash is null;

  if not found then
    raise exception 'Profile is already activated';
  end if;

  return true;
end;
$$;

revoke all on function public.activate_profile(text, text, text)
  from public, anon, authenticated;
grant execute on function public.activate_profile(text, text, text)
  to service_role;