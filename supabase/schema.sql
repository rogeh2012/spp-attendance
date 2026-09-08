-- School of Praise & Prayer — attendance schema
-- Run once in Supabase → SQL Editor (or via supabase db push).

create extension if not exists pgcrypto;

-- Readable, unambiguous 8-char code: no 0/O/1/I. ~1.1e12 combinations.
create or replace function public.gen_qr_token()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..8 loop
    out := out || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  return 'SPP-' || out;
end $$;

create table if not exists public.students (
  id          bigint generated always as identity primary key,
  name        text not null,
  phone       text,
  group_name  text,
  qr_token    text not null unique default public.gen_qr_token(),
  created_at  timestamptz not null default now()
);

create table if not exists public.attendance (
  id            bigint generated always as identity primary key,
  student_id    bigint not null references public.students(id) on delete cascade,
  session_date  date not null,                       -- Cairo calendar date
  session_no    smallint not null check (session_no in (1, 2)),
  scanned_at    timestamptz not null default now(),  -- stored UTC, shown in Africa/Cairo
  scanned_by    uuid references auth.users(id),
  unique (student_id, session_date, session_no)      -- one scan per student per session
);

create index if not exists attendance_session_idx on public.attendance (session_date, session_no);

-- Convenience view with Cairo-local time, handy for the Supabase table editor / exports.
create or replace view public.attendance_cairo as
select a.id, s.name, s.group_name, a.session_date, a.session_no,
       (a.scanned_at at time zone 'Africa/Cairo') as scanned_at_cairo,
       a.scanned_at
from public.attendance a
join public.students s on s.id = a.student_id
order by a.session_date, a.session_no, a.scanned_at;

-- The scan: one round-trip, returns {status, student_name, scanned_at}
--   recorded  -> new row inserted
--   duplicate -> already present for that session (no new row)
--   unknown   -> token does not match any student
create or replace function public.record_scan(p_token text, p_session_date date default null, p_session_no smallint default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student   public.students%rowtype;
  v_date      date := coalesce(p_session_date, (now() at time zone 'Africa/Cairo')::date);
  v_existing  timestamptz;
  v_now       timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into v_student from public.students where qr_token = upper(trim(p_token));
  if not found then
    return jsonb_build_object('status', 'unknown', 'student_name', null, 'scanned_at', null);
  end if;

  select scanned_at into v_existing from public.attendance
   where student_id = v_student.id and session_date = v_date and session_no = p_session_no;
  if found then
    return jsonb_build_object('status', 'duplicate', 'student_name', v_student.name, 'scanned_at', v_existing);
  end if;

  insert into public.attendance (student_id, session_date, session_no, scanned_at, scanned_by)
  values (v_student.id, v_date, p_session_no, v_now, auth.uid());

  return jsonb_build_object('status', 'recorded', 'student_name', v_student.name, 'scanned_at', v_now);
end $$;

-- Row Level Security: only signed-in admins can touch anything. Anonymous gets nothing.
alter table public.students   enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "admins manage students" on public.students;
create policy "admins manage students" on public.students
  for all to authenticated using (true) with check (true);

drop policy if exists "admins manage attendance" on public.attendance;
create policy "admins manage attendance" on public.attendance
  for all to authenticated using (true) with check (true);

revoke all on public.students, public.attendance from anon;
grant execute on function public.record_scan(text, date, smallint) to authenticated;
revoke execute on function public.record_scan(text, date, smallint) from anon;
