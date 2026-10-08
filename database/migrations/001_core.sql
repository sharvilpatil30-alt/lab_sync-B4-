-- ============================================================
-- Smart Campus Lab & Resource Optimizer — Supabase schema
-- Owner: Team C. Run in Supabase SQL editor or via `supabase db push`.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Identity (extends Supabase's built-in auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('student','faculty','lab_admin')),
  created_at  timestamptz not null default now()
);

-- ---------- Campus graph (Team B) ----------
create table public.campus_nodes (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  node_type   text not null,               -- 'lab' | 'building' | 'landmark'
  created_at  timestamptz not null default now()
);

create table public.campus_edges (
  id          uuid primary key default uuid_generate_v4(),
  from_node   uuid not null references public.campus_nodes(id),
  to_node     uuid not null references public.campus_nodes(id),
  distance_m  numeric not null,
  weight      numeric not null,
  created_at  timestamptz not null default now()
);

-- ---------- Labs & resources (Team C, positioned on Team B's graph) ----------
create table public.labs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  node_id     uuid references public.campus_nodes(id),
  capacity    int not null default 0
);

create table public.resources (
  id          uuid primary key default uuid_generate_v4(),
  lab_id      uuid not null references public.labs(id),
  label       text not null,               -- e.g. "C04"
  state       text not null default 'AVAILABLE'
              check (state in ('AVAILABLE','RESERVED','ALLOCATED','RELEASING','MAINTENANCE')),
  version     int not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------- Bookings — the authoritative record (Team C) ----------
create table public.bookings (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id),
  lab_id           uuid not null references public.labs(id),
  resource_id      uuid references public.resources(id),
  state            text not null default 'REQUESTED'
                   check (state in (
                     'REQUESTED','VALIDATED','QUEUED','LEASED','CONFIRMED','ACTIVE',
                     'COMPLETED','REJECTED','WAITLISTED','CANCELLED','EXPIRED',
                     'COMPENSATION_REQUIRED')),
  priority         int not null default 2,
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  idempotency_key  text not null unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_bookings_user       on public.bookings(user_id);
create index idx_bookings_lab_state  on public.bookings(lab_id, state);

-- ---------- Scheduling decisions — Team A's output, persisted by Team C ----------
create table public.scheduling_decisions (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid not null references public.bookings(id),
  request_id   text not null,
  policy       text not null,             -- FCFS | SJF | ROUND_ROBIN | PRIORITY
  decision     text not null,             -- ALLOCATED | WAITLISTED | REJECTED
  lease_id     text,
  metrics      jsonb,
  created_at   timestamptz not null default now()
);

-- ---------- Routes — Team B's output, persisted by Team C ----------
create table public.routes (
  id                 uuid primary key default uuid_generate_v4(),
  booking_id         uuid references public.bookings(id),
  origin_node        uuid references public.campus_nodes(id),
  destination_node   uuid references public.campus_nodes(id),
  algorithm          text not null,       -- DIJKSTRA | BELLMAN_FORD
  path               jsonb not null,
  cost               numeric not null,
  created_at         timestamptz not null default now()
);

-- ---------- Audit log ----------
create table public.audit_log (
  id              uuid primary key default uuid_generate_v4(),
  actor_id        uuid references public.profiles(id),
  action          text not null,
  before          jsonb,
  after           jsonb,
  correlation_id  text not null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- Rule: authenticated users get read-only, scoped access.
-- No insert/update policies are defined for the 'authenticated'
-- role anywhere below — that's deliberate. Writes only happen
-- through the backend's service-role key, which bypasses RLS.
-- A direct write attempt from the frontend's anon key is denied
-- by default because no policy grants it.
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.labs                enable row level security;
alter table public.resources           enable row level security;
alter table public.bookings            enable row level security;
alter table public.scheduling_decisions enable row level security;
alter table public.routes              enable row level security;
alter table public.audit_log           enable row level security;
alter table public.campus_nodes        enable row level security;
alter table public.campus_edges        enable row level security;

create policy "self or admin can read profile" on public.profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'lab_admin')
  );

create policy "authenticated can read labs" on public.labs
  for select using (auth.role() = 'authenticated');

create policy "authenticated can read resources" on public.resources
  for select using (auth.role() = 'authenticated');

create policy "authenticated can read campus graph nodes" on public.campus_nodes
  for select using (auth.role() = 'authenticated');

create policy "authenticated can read campus graph edges" on public.campus_edges
  for select using (auth.role() = 'authenticated');

create policy "own bookings or staff can read" on public.bookings
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('faculty','lab_admin'))
  );

create policy "own scheduling decisions or staff can read" on public.scheduling_decisions
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (b.user_id = auth.uid()
           or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('faculty','lab_admin')))
    )
  );

create policy "own routes or staff can read" on public.routes
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (b.user_id = auth.uid()
           or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('faculty','lab_admin')))
    )
  );

create policy "admin can read audit log" on public.audit_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'lab_admin')
  );

-- ============================================================
-- Atomic booking commit (Team C's ACID requirement, done for real)
-- A single plpgsql function body runs as one transaction — this
-- is what makes the multi-table write atomic. Called from Node as:
--   supabase.rpc('commit_booking', { ...params })
-- ============================================================

create or replace function public.commit_booking(
  p_booking_id       uuid,
  p_resource_id      uuid,
  p_decision         text,      -- 'ALLOCATED' | 'WAITLISTED' | 'REJECTED'
  p_lease_id         text,
  p_request_id       text,
  p_policy           text,
  p_metrics          jsonb,
  p_route            jsonb,
  p_route_cost       numeric,
  p_algorithm        text,
  p_origin_node      uuid,
  p_destination_node uuid,
  p_actor_id         uuid,
  p_correlation_id   text
) returns void
language plpgsql
as $$
begin
  update public.bookings
    set state = case
                  when p_decision = 'ALLOCATED'  then 'CONFIRMED'
                  when p_decision = 'WAITLISTED' then 'WAITLISTED'
                  else 'REJECTED'
                end,
        resource_id = p_resource_id,
        updated_at = now()
    where id = p_booking_id;

  insert into public.scheduling_decisions
    (booking_id, request_id, policy, decision, lease_id, metrics)
  values
    (p_booking_id, p_request_id, p_policy, p_decision, p_lease_id, p_metrics);

  if p_decision = 'ALLOCATED' then
    update public.resources
      set state = 'ALLOCATED', updated_at = now()
      where id = p_resource_id;
  end if;

  if p_route is not null then
    insert into public.routes
      (booking_id, origin_node, destination_node, algorithm, path, cost)
    values
      (p_booking_id, p_origin_node, p_destination_node, p_algorithm, p_route, p_route_cost);
  end if;

  insert into public.audit_log (actor_id, action, after, correlation_id)
  values (
    p_actor_id,
    'BOOKING_COMMIT',
    jsonb_build_object('booking_id', p_booking_id, 'decision', p_decision),
    p_correlation_id
  );
end;
$$;

-- Compensation: release a lease if downstream steps fail after allocation
create or replace function public.compensate_booking(
  p_booking_id      uuid,
  p_resource_id     uuid,
  p_actor_id        uuid,
  p_correlation_id  text,
  p_reason          text
) returns void
language plpgsql
as $$
begin
  update public.bookings
    set state = 'COMPENSATION_REQUIRED', updated_at = now()
    where id = p_booking_id;

  update public.resources
    set state = 'AVAILABLE', updated_at = now()
    where id = p_resource_id;

  insert into public.audit_log (actor_id, action, after, correlation_id)
  values (
    p_actor_id,
    'BOOKING_COMPENSATE',
    jsonb_build_object('booking_id', p_booking_id, 'reason', p_reason),
    p_correlation_id
  );
end;
$$;
