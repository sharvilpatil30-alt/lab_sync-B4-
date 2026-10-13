-- ============================================================
-- Smart Campus Lab & Resource Optimizer
-- 3NF inventory extension for the uploaded CSE dead-stock data
-- Run AFTER the existing schema.sql.
-- ============================================================

create table if not exists public.equipment_categories (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null unique
);

create table if not exists public.suppliers (
  id       uuid primary key default uuid_generate_v4(),
  name     text not null,
  gstin    text unique,
  address  text
);

create table if not exists public.equipment_models (
  id           uuid primary key default uuid_generate_v4(),
  category_id  uuid not null references public.equipment_categories(id),
  brand        text,
  model_name   text not null,
  config_key   text not null unique
);

alter table public.labs
  add column if not exists lab_code text unique,
  add column if not exists investment numeric(14,2);

create table if not exists public.purchase_batches (
  id                    uuid primary key default uuid_generate_v4(),
  acquisition_lab_id    uuid not null references public.labs(id),
  model_id              uuid not null references public.equipment_models(id),
  supplier_id           uuid references public.suppliers(id),
  register_sr_no        text not null,
  purchase_date         date,
  reference_no          text,
  quantity_original     int check (quantity_original is null or quantity_original >= 0),
  quantity_current      int check (quantity_current is null or quantity_current >= 0),
  unit_rate             numeric(14,2),
  total_cost            numeric(16,2),
  status                text,
  source_file           text not null,
  source_page           int not null,
  source_description    text,
  unique (acquisition_lab_id, register_sr_no, source_file, source_page)
);

create table if not exists public.asset_events (
  id               uuid primary key default uuid_generate_v4(),
  batch_id         uuid not null references public.purchase_batches(id) on delete cascade,
  event_type       text not null check (event_type in (
                     'TRANSFER_OUT','TRANSFER_IN','WRITEOFF',
                     'CONDITION_CHANGE','GIFT_RECEIVED','INSPECTION_OK')),
  quantity_change  int not null default 0,
  from_lab_id      uuid references public.labs(id),
  to_lab_id        uuid references public.labs(id),
  event_date       date,
  details          text,
  created_at       timestamptz not null default now()
);

-- A resource is the operational/bookable unit.
-- batch_id connects it to procurement/dead-stock history.
alter table public.resources
  add column if not exists batch_id uuid references public.purchase_batches(id),
  add column if not exists serial_no text;

create unique index if not exists uq_resources_serial_no
  on public.resources(serial_no)
  where serial_no is not null;

create table if not exists public.computer_specs (
  model_id          uuid primary key references public.equipment_models(id) on delete cascade,
  processor         text,
  ram_gb            int,
  storage           text,
  operating_system  text,
  monitor_size_in   numeric(5,2)
);

create table if not exists public.laptop_specs (
  model_id          uuid primary key references public.equipment_models(id) on delete cascade,
  processor         text,
  ram_gb            int,
  storage           text,
  operating_system  text,
  monitor_size_in   numeric(5,2)
);

create table if not exists public.printer_specs (
  model_id           uuid primary key references public.equipment_models(id) on delete cascade,
  functions          text,
  print_speed_ppm    int,
  resolution         text,
  connectivity       text,
  input_tray_sheets  int
);

create table if not exists public.ups_specs (
  model_id             uuid primary key references public.equipment_models(id) on delete cascade,
  capacity_kva         numeric(8,2),
  dc_voltage           int,
  input_voltage_range  text,
  output_power_factor  numeric(5,2),
  charger_amp          int,
  battery_spec         text
);

create table if not exists public.battery_specs (
  model_id      uuid primary key references public.equipment_models(id) on delete cascade,
  voltage_v     int,
  capacity_ah   int,
  battery_type  text
);

create table if not exists public.projector_specs (
  model_id            uuid primary key references public.equipment_models(id) on delete cascade,
  technology          text,
  brightness_lumens   int
);

create table if not exists public.interactive_panel_specs (
  model_id           uuid primary key references public.equipment_models(id) on delete cascade,
  screen_size_in     numeric(5,2),
  resolution         text,
  android_version    text,
  ram_gb             int,
  storage            text,
  touch_points       int,
  touch_accuracy_mm  numeric(5,2),
  type_c_power_w     int
);

create index if not exists idx_purchase_batches_lab
  on public.purchase_batches(acquisition_lab_id);

create index if not exists idx_purchase_batches_model
  on public.purchase_batches(model_id);

create index if not exists idx_asset_events_batch
  on public.asset_events(batch_id);

create index if not exists idx_resources_batch
  on public.resources(batch_id);

-- Backend-only inventory access until authenticated policies are reviewed.
alter table public.equipment_categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.equipment_models enable row level security;
alter table public.purchase_batches enable row level security;
alter table public.asset_events enable row level security;
alter table public.computer_specs enable row level security;
alter table public.laptop_specs enable row level security;
alter table public.printer_specs enable row level security;
alter table public.ups_specs enable row level security;
alter table public.battery_specs enable row level security;
alter table public.projector_specs enable row level security;
alter table public.interactive_panel_specs enable row level security;
