alter table public.care_completions
  add column observation text
  check (
    observation is null
    or (length(trim(observation)) between 1 and 1000)
  );
