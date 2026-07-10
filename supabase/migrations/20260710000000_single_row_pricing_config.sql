-- ============================================================
-- EASI RIDE — CONSOLIDATE PRICING_CONFIG TO A SINGLE ROW
-- Run this in the Supabase SQL editor
-- ============================================================

-- Drop bracket-based unique constraint (no longer needed)
alter table pricing_config drop constraint if exists pricing_config_distance_bracket_ride_type_key;

-- Drop check constraints that prevent a single global row
alter table pricing_config drop constraint if exists pricing_config_distance_bracket_check;
alter table pricing_config drop constraint if exists pricing_config_ride_type_check;

-- Delete all bracket-based rows and insert one global row
delete from pricing_config;

insert into pricing_config (distance_bracket, ride_type, gross_fare, commission, base_fare, per_km_rate, surge_mode, surge_active, surge_normal, surge_peak, surge_rain)
values ('global', 'global', 0, 0, 7.00, 7.00, 'normal', false, 1.00, 1.30, 1.50);

-- ============================================================
-- END
-- ============================================================
