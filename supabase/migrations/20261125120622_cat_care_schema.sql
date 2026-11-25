create table public.profiles (
  profile_key text primary key
    check (profile_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  display_name text not null,
  role text not null
    check (role in ('admin', 'family', 'guest')),
  password_hash text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  check (profile_key <> 'marcos' or role = 'admin'),
  check (profile_key = 'marcos' or role <> 'admin'),
  check ((profile_key = 'invitado' and role = 'guest')
    or (profile_key <> 'invitado' and role <> 'guest'))
);

create table public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.profiles (profile_key)
    on delete restrict,
  code_hash text not null unique
    check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by text not null references public.profiles (profile_key)
    on delete restrict,
  created_at timestamptz not null default now()
);

create unique index activation_codes_one_active_per_profile
  on public.activation_codes (profile_key)
  where used_at is null and revoked_at is null;

create table public.feeding_schedules (
  id uuid primary key default gen_random_uuid(),
  meal_name text not null,
  portion text,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  scheduled_time time not null,
  is_active boolean not null default true,
  created_by text not null references public.profiles (profile_key)
    on delete restrict,
  created_at timestamptz not null default now()
);

create table public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_name text not null,
  instructions text not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_by text not null references public.profiles (profile_key)
    on delete restrict,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.medication_schedule_times (
  medication_schedule_id uuid not null
    references public.medication_schedules (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  scheduled_time time not null,
  primary key (medication_schedule_id, day_of_week, scheduled_time)
);

create table public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  task_name text not null,
  instructions text,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  scheduled_time time,
  is_active boolean not null default true,
  created_by text not null references public.profiles (profile_key)
    on delete restrict,
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null
    check (event_type in ('veterinary', 'checkup', 'other')),
  event_date date not null,
  event_time time,
  details text,
  created_by text not null references public.profiles (profile_key)
    on delete restrict,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  content text not null check (length(trim(content)) > 0),
  created_by text not null references public.profiles (profile_key)
    on delete restrict,
  created_at timestamptz not null default now()
);

create table public.care_completions (
  id uuid primary key default gen_random_uuid(),
  feeding_schedule_id uuid
    references public.feeding_schedules (id) on delete restrict,
  medication_schedule_id uuid
    references public.medication_schedules (id) on delete restrict,
  care_task_id uuid
    references public.care_tasks (id) on delete restrict,
  activity_date date not null,
  completed_by text not null references public.profiles (profile_key)
    on delete restrict,
  completed_at timestamptz not null default now(),
  check (num_nonnulls(
    feeding_schedule_id,
    medication_schedule_id,
    care_task_id
  ) = 1)
);

create unique index care_completions_feeding_once_per_day
  on public.care_completions (feeding_schedule_id, activity_date)
  where feeding_schedule_id is not null;

create unique index care_completions_medication_once_per_day
  on public.care_completions (medication_schedule_id, activity_date)
  where medication_schedule_id is not null;

create unique index care_completions_task_once_per_day
  on public.care_completions (care_task_id, activity_date)
  where care_task_id is not null;

create index feeding_schedules_weekly_order
  on public.feeding_schedules (day_of_week, scheduled_time)
  where is_active;

create index medication_schedules_active_dates
  on public.medication_schedules (start_date, end_date)
  where is_active;

create index care_tasks_weekly_order
  on public.care_tasks (day_of_week, scheduled_time)
  where is_active;

create index calendar_events_by_date
  on public.calendar_events (event_date);

create index care_completions_by_date
  on public.care_completions (activity_date, completed_at);

alter table public.profiles enable row level security;
alter table public.activation_codes enable row level security;
alter table public.feeding_schedules enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.medication_schedule_times enable row level security;
alter table public.care_tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.notes enable row level security;
alter table public.care_completions enable row level security;