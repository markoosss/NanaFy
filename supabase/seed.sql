insert into public.profiles (profile_key, display_name, role)
values
  ('marcos', 'Marcos', 'admin'),
  ('mama', 'Mama', 'family'),
  ('papa', 'Papa', 'family'),
  ('kiro', 'Kiro', 'family'),
  ('invitado', 'Invitado', 'guest')
on conflict (profile_key) do nothing;
