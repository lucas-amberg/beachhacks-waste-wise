-- WasteWise AI+ Database Schema

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  image_url text,
  total_amount numeric,
  carbon_kg numeric not null,
  created_at timestamp with time zone default now()
);

create table if not exists receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid references receipts(id) on delete cascade,
  name text not null,
  category text,
  estimated_carbon_kg numeric not null,
  quantity int default 1
);

create table if not exists waste_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  image_url text,
  category text not null,
  confidence numeric,
  created_at timestamp with time zone default now()
);

create table if not exists carbon_offsets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  receipt_id uuid references receipts(id) on delete set null,
  carbon_offset_kg numeric not null,
  cost_usd numeric not null,
  created_at timestamp with time zone default now()
);

-- Indexes for common queries
create index if not exists idx_receipts_user on receipts(user_id);
create index if not exists idx_receipt_items_receipt on receipt_items(receipt_id);
create index if not exists idx_waste_scans_user on waste_scans(user_id);
create index if not exists idx_carbon_offsets_user on carbon_offsets(user_id);
