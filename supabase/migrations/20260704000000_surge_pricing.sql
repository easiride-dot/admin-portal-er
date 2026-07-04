-- ============================================================
-- EASI RIDE — SURGE PRICING & GLOBAL CONFIG
-- Run this in the Supabase SQL editor
-- ============================================================

-- Add surge and global fare columns to pricing_config
-- (table already exists with bracket-based rows — these new
--  columns apply globally to all rows for simplicity)
alter table pricing_config
  add column if not exists surge_mode varchar(10)
    not null default 'normal'
    check (surge_mode in ('normal', 'peak', 'rain')),
  add column if not exists surge_active boolean
    not null default false,
  add column if not exists base_fare numeric(10,2)
    not null default 7.00,
  add column if not exists per_km_rate numeric(10,2)
    not null default 7.00,
  add column if not exists surge_normal numeric(4,2)
    not null default 1.00,
  add column if not exists surge_peak numeric(4,2)
    not null default 1.30,
  add column if not exists surge_rain numeric(4,2)
    not null default 1.50;

-- Update existing rows with the global defaults
update pricing_config set
  base_fare = 7.00,
  per_km_rate = 7.00,
  surge_mode = 'normal',
  surge_active = false,
  surge_normal = 1.00,
  surge_peak = 1.30,
  surge_rain = 1.50
where base_fare is null;

-- Replace policies for the new read/write model
drop policy if exists "Admin updates pricing" on pricing_config;
drop policy if exists "Anyone reads pricing" on pricing_config;
drop policy if exists "Admins can manage pricing" on pricing_config;
drop policy if exists "Users can read pricing" on pricing_config;

create policy "Anyone reads pricing"
  on pricing_config for select
  using (true);

create policy "Admin updates pricing"
  on pricing_config for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- END
-- ============================================================
