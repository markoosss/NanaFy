create or replace function public.save_feeding_schedule(
  p_id uuid,
  p_meal_name text,
  p_portion text,
  p_day_of_week smallint,
  p_scheduled_time time,
  p_is_active boolean,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  schedule_id uuid;
begin
  if p_created_by is distinct from 'marcos' then
    return null;
  end if;

  if p_id is null then
    insert into public.feeding_schedules (
      meal_name,
      portion,
      day_of_week,
      scheduled_time,
      is_active,
      created_by
    )
    values (
      p_meal_name,
      p_portion,
      p_day_of_week,
      p_scheduled_time,
      p_is_active,
      p_created_by
    )
    returning id into schedule_id;
  else
    update public.feeding_schedules
    set meal_name = p_meal_name,
        portion = p_portion,
        day_of_week = p_day_of_week,
        scheduled_time = p_scheduled_time,
        is_active = p_is_active
    where id = p_id
      and created_by = p_created_by
    returning id into schedule_id;
  end if;

  return schedule_id;
end;
$$;

create or replace function public.save_care_task(
  p_id uuid,
  p_task_name text,
  p_instructions text,
  p_day_of_week smallint,
  p_scheduled_time time,
  p_is_active boolean,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_id uuid;
begin
  if p_created_by is distinct from 'marcos' then
    return null;
  end if;

  if p_id is null then
    insert into public.care_tasks (
      task_name,
      instructions,
      day_of_week,
      scheduled_time,
      is_active,
      created_by
    )
    values (
      p_task_name,
      p_instructions,
      p_day_of_week,
      p_scheduled_time,
      p_is_active,
      p_created_by
    )
    returning id into task_id;
  else
    update public.care_tasks
    set task_name = p_task_name,
        instructions = p_instructions,
        day_of_week = p_day_of_week,
        scheduled_time = p_scheduled_time,
        is_active = p_is_active
    where id = p_id
      and created_by = p_created_by
    returning id into task_id;
  end if;

  return task_id;
end;
$$;

create or replace function public.save_medication_schedule(
  p_id uuid,
  p_medication_name text,
  p_instructions text,
  p_start_date date,
  p_end_date date,
  p_is_active boolean,
  p_times jsonb,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  schedule_id uuid;
begin
  if p_created_by is distinct from 'marcos' then
    return null;
  end if;

  if p_times is null or pg_catalog.jsonb_typeof(p_times) <> 'array' then
    return null;
  end if;

  if pg_catalog.jsonb_array_length(p_times) = 0 then
    return null;
  end if;

  if p_id is null then
    insert into public.medication_schedules (
      medication_name,
      instructions,
      start_date,
      end_date,
      is_active,
      created_by
    )
    values (
      p_medication_name,
      p_instructions,
      p_start_date,
      p_end_date,
      p_is_active,
      p_created_by
    )
    returning id into schedule_id;
  else
    update public.medication_schedules
    set medication_name = p_medication_name,
        instructions = p_instructions,
        start_date = p_start_date,
        end_date = p_end_date,
        is_active = p_is_active
    where id = p_id
      and created_by = p_created_by
    returning id into schedule_id;

    if schedule_id is null then
      return null;
    end if;

    delete from public.medication_schedule_times
    where medication_schedule_id = schedule_id;
  end if;

  insert into public.medication_schedule_times (
    medication_schedule_id,
    day_of_week,
    scheduled_time
  )
  select
    schedule_id,
    (time_entry ->> 'dayOfWeek')::smallint,
    (time_entry ->> 'scheduledTime')::time
  from pg_catalog.jsonb_array_elements(p_times) as entries(time_entry);

  return schedule_id;
end;
$$;

revoke all on function public.save_feeding_schedule(uuid, text, text, smallint, time, boolean, text)
  from public, anon, authenticated;
grant execute on function public.save_feeding_schedule(uuid, text, text, smallint, time, boolean, text)
  to service_role;

revoke all on function public.save_care_task(uuid, text, text, smallint, time, boolean, text)
  from public, anon, authenticated;
grant execute on function public.save_care_task(uuid, text, text, smallint, time, boolean, text)
  to service_role;

revoke all on function public.save_medication_schedule(uuid, text, text, date, date, boolean, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.save_medication_schedule(uuid, text, text, date, date, boolean, jsonb, text)
  to service_role;
