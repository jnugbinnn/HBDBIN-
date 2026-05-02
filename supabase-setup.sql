alter table birthday_messages
  add column if not exists id uuid primary key default gen_random_uuid(),
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists is_public boolean default true,
  add column if not exists created_at timestamp with time zone default now();

create or replace view public_cards as
select id, image_url, created_at
from birthday_messages
where is_public = true
  and image_url is not null;

grant select on public_cards to anon;

-- Temporary admin mode note:
-- The current /admin page is protected only by VITE_ADMIN_PASSWORD in the
-- browser, so this is not strong security. For this personal project to read
-- cards from the browser-only admin page, anon needs table access below.
-- For production, replace this with Supabase Auth plus RLS policies or a
-- server-side admin endpoint using the service role key.

grant insert, select, delete on birthday_messages to anon;

-- If Row Level Security is enabled on birthday_messages, also run policies like these.
-- They keep visitors able to create cards, while only exposing cover data through
-- public_cards for the public home screen. The browser-only admin still depends on
-- the temporary password in VITE_ADMIN_PASSWORD, so treat this as personal-project
-- protection rather than production security.

drop policy if exists "Allow public birthday card inserts" on birthday_messages;
drop policy if exists "Allow temporary admin reads" on birthday_messages;
drop policy if exists "Allow temporary admin deletes" on birthday_messages;

create policy "Allow public birthday card inserts"
on birthday_messages
for insert
to anon
with check (true);

create policy "Allow temporary admin reads"
on birthday_messages
for select
to anon
using (true);

create policy "Allow temporary admin deletes"
on birthday_messages
for delete
to anon
using (true);

-- Storage bucket name used by the app:
-- card-covers
--
-- For this browser-only personal project, allow anonymous uploads/selects
-- only if you are comfortable with that tradeoff. Stronger production security
-- should use real auth, RLS policies, and/or server-side upload endpoints.
