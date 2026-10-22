-- Dayzero: security rules self-test.
--
-- Paste into the Supabase SQL editor and click Run. Every row in the result
-- should say PASS. It uses made-up people (selftest-…@example.com) and runs as
-- one transaction that is cleaned up at the end, so your real data is untouched.

create temp table if not exists selftest (n serial, check_name text, passed boolean);
truncate selftest;
grant all on selftest to authenticated, anon;
grant usage on sequence selftest_n_seq to authenticated, anon;

-- ------------------------------------------------------------ test data
delete from public.clients where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
delete from public.coaches where email = 'selftest-coach@example.com';

insert into public.coaches (email, user_id) values ('selftest-coach@example.com', '00000000-0000-4000-8000-0000000000c0');
insert into public.clients (id, name, email, lead_source, stage, stage_history, program_tier, goal, targets, user_id) values
  ('00000000-0000-4000-8000-00000000000a', 'Selftest Alice', 'selftest-a@example.com', 'referral', 'active', '[]', 'tier_1', 'fat_loss', '{}', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-00000000000b', 'Selftest Bob', 'selftest-b@example.com', 'social', 'active', '[]', 'tier_1', 'recomp', '{}', '00000000-0000-4000-8000-0000000000b1');
insert into public.client_private (client_id, notes) values
  ('00000000-0000-4000-8000-00000000000a', 'private A'),
  ('00000000-0000-4000-8000-00000000000b', 'private B');
insert into public.progress_logs (client_id, date, steps) values
  ('00000000-0000-4000-8000-00000000000a', '2000-01-01', 100),
  ('00000000-0000-4000-8000-00000000000b', '2000-01-01', 200);
insert into public.check_ins (client_id, date, adherence_rating, submitted_by, status) values
  ('00000000-0000-4000-8000-00000000000b', '2000-01-01', 3, 'coach', 'complete');

-- ------------------------------------------------ as client Alice
set role authenticated;
set request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

insert into selftest (check_name, passed) select 'Client: my_role() is client', public.my_role() = 'client';
insert into selftest (check_name, passed) select 'Client: sees only their own profile',
  (select count(*) from public.clients where name like 'Selftest%') = 1 and exists (select 1 from public.clients where name = 'Selftest Alice');
insert into selftest (check_name, passed) select 'Client: cannot read coach-private notes', (select count(*) from public.client_private) = 0;
insert into selftest (check_name, passed) select 'Client: sees only their own logs',
  (select count(*) from public.progress_logs where date = '2000-01-01') = 1 and (select steps from public.progress_logs where date = '2000-01-01') = 100;
insert into selftest (check_name, passed) select 'Client: cannot see other clients'' check-ins', (select count(*) from public.check_ins) = 0;

do $$ begin
  insert into public.progress_logs (client_id, date, steps) values ('00000000-0000-4000-8000-00000000000a', '2000-01-02', 1);
  update public.progress_logs set steps = 150 where client_id = '00000000-0000-4000-8000-00000000000a' and date = '2000-01-02';
  insert into selftest (check_name, passed) values ('Client: can log and edit their own day', true);
exception when others then
  insert into selftest (check_name, passed) values ('Client: can log and edit their own day', false);
end $$;

do $$ begin
  insert into public.progress_logs (client_id, date, steps) values ('00000000-0000-4000-8000-00000000000b', '2000-01-03', 1);
  raise exception 'allowed';
exception when others then
  insert into selftest (check_name, passed) values ('Client: cannot log for another client', sqlerrm <> 'allowed');
end $$;

do $$ declare changed int; begin
  update public.progress_logs set steps = 999 where client_id = '00000000-0000-4000-8000-00000000000b';
  get diagnostics changed = row_count;
  insert into selftest (check_name, passed) values ('Client: cannot change another client''s logs', changed = 0);
end $$;

do $$ declare changed int; begin
  update public.clients set name = 'Hacked' where id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics changed = row_count;
  insert into selftest (check_name, passed) values ('Client: cannot change their own profile or targets', changed = 0);
end $$;

do $$ begin
  insert into public.check_ins (client_id, date, adherence_rating, wins, submitted_by, status)
  values ('00000000-0000-4000-8000-00000000000a', '2000-01-02', 4, 'test', 'client', 'awaiting_coach');
  insert into selftest (check_name, passed) values ('Client: can send their own check-in', true);
exception when others then
  insert into selftest (check_name, passed) values ('Client: can send their own check-in', false);
end $$;

do $$ begin
  insert into public.check_ins (client_id, date, adherence_rating, coach_notes, submitted_by, status)
  values ('00000000-0000-4000-8000-00000000000a', '2000-01-03', 5, 'fake coach reply', 'client', 'awaiting_coach');
  raise exception 'allowed';
exception when others then
  insert into selftest (check_name, passed) values ('Client: cannot write the coach''s reply', sqlerrm <> 'allowed');
end $$;

do $$ begin
  insert into public.check_ins (client_id, date, adherence_rating, next_actions, submitted_by, status)
  values ('00000000-0000-4000-8000-00000000000a', '2000-01-03', 5, 'fake next actions', 'client', 'awaiting_coach');
  raise exception 'allowed';
exception when others then
  insert into selftest (check_name, passed) values ('Client: cannot write the coach''s next actions', sqlerrm <> 'allowed');
end $$;

do $$ begin
  insert into public.check_ins (client_id, date, adherence_rating, submitted_by, status)
  values ('00000000-0000-4000-8000-00000000000a', '2000-01-03', 5, 'client', 'complete');
  raise exception 'allowed';
exception when others then
  insert into selftest (check_name, passed) values ('Client: cannot mark a check-in complete', sqlerrm <> 'allowed');
end $$;

do $$ begin
  insert into public.check_ins (client_id, date, adherence_rating, submitted_by, status)
  values ('00000000-0000-4000-8000-00000000000a', '2000-01-03', 5, 'coach', 'awaiting_coach');
  raise exception 'allowed';
exception when others then
  insert into selftest (check_name, passed) values ('Client: cannot pose as the coach', sqlerrm <> 'allowed');
end $$;

do $$ begin
  insert into public.check_ins (client_id, date, adherence_rating, submitted_by, status)
  values ('00000000-0000-4000-8000-00000000000b', '2000-01-03', 5, 'client', 'awaiting_coach');
  raise exception 'allowed';
exception when others then
  insert into selftest (check_name, passed) values ('Client: cannot send a check-in as someone else', sqlerrm <> 'allowed');
end $$;

do $$ declare changed int; begin
  update public.check_ins set coach_notes = 'self-reply', status = 'complete' where client_id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics changed = row_count;
  insert into selftest (check_name, passed) values ('Client: cannot edit check-ins after sending', changed = 0);
end $$;

-- ------------------------------------- as a stranger (signed in, not added)
set request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000ff", "role": "authenticated"}';

insert into selftest (check_name, passed) select 'Stranger: my_role() is unlinked', public.my_role() = 'unlinked';
insert into selftest (check_name, passed) select 'Stranger: sees no clients, logs or check-ins',
  (select count(*) from public.clients) = 0 and (select count(*) from public.progress_logs) = 0 and (select count(*) from public.check_ins) = 0;

-- ---------------------------------------------------------- as the coach
set request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000c0", "role": "authenticated"}';

insert into selftest (check_name, passed) select 'Coach: my_role() is coach', public.my_role() = 'coach';
insert into selftest (check_name, passed) select 'Coach: sees every client', (select count(*) from public.clients where name like 'Selftest%') = 2;
insert into selftest (check_name, passed) select 'Coach: can read private notes', (select count(*) from public.client_private where notes like 'private %') = 2;
insert into selftest (check_name, passed) select 'Coach: sees the client''s new check-in', exists (
  select 1 from public.check_ins where client_id = '00000000-0000-4000-8000-00000000000a' and status = 'awaiting_coach');

do $$ declare changed int; begin
  update public.check_ins set coach_notes = 'Great week!', status = 'complete'
  where client_id = '00000000-0000-4000-8000-00000000000a' and status = 'awaiting_coach';
  get diagnostics changed = row_count;
  insert into selftest (check_name, passed) values ('Coach: can reply to a check-in', changed = 1);
end $$;

-- -------------------------------------------------- not signed in at all
set role anon;
do $$ begin
  perform 1 from public.clients;
  raise exception 'allowed';
exception when others then
  insert into selftest (check_name, passed) values ('Signed out: cannot read anything', sqlerrm <> 'allowed');
end $$;

-- ------------------------------------------------------------- clean up
reset role;
reset request.jwt.claims;
delete from public.clients where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
delete from public.coaches where email = 'selftest-coach@example.com';

select check_name as "Check", case when passed then 'PASS' else 'FAIL' end as "Result" from selftest order by n;
