-- Support & Emergency Configuration (seed data for admin project)
-- The app_settings table already exists from access_control migration

-- Seed support & emergency configuration
INSERT INTO public.app_settings (setting_name, setting_value) VALUES
  ('support_phone', '+23272804884'),
  ('support_whatsapp', '+23272804884'),
  ('emergency_contacts', '[{"label":"Police","number":"119"},{"label":"Ambulance","number":"112"},{"label":"Fire","number":"119"}]')
ON CONFLICT (setting_name) DO NOTHING;