-- App settings (key-value store for admin-configurable settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Waitlist for when the app is at capacity
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false
);

-- Insert default max_users setting
INSERT INTO public.app_settings (setting_name, setting_value)
VALUES ('max_users', '100')
ON CONFLICT (setting_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Anyone authenticated can read app_settings (student app needs to check max_users)
CREATE POLICY IF NOT EXISTS "Anyone authenticated can read app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify app_settings
CREATE POLICY IF NOT EXISTS "Only admins can insert app_settings"
  ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Only admins can update app_settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Only admins can delete app_settings"
  ON public.app_settings
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Anyone can join the waitlist (no auth required)
CREATE POLICY IF NOT EXISTS "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view/manage the waitlist
CREATE POLICY IF NOT EXISTS "Admins can view waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can update waitlist"
  ON public.waitlist
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Admins can delete waitlist"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Function to get current registered user count
CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer FROM auth.users;
$$;

-- Colleges table (managed by admin, used by student app for campus selection)
CREATE TABLE IF NOT EXISTS public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read colleges (student app needs the list)
CREATE POLICY IF NOT EXISTS "Anyone authenticated can read colleges"
  ON public.colleges
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage colleges
CREATE POLICY IF NOT EXISTS "Only admins can insert colleges"
  ON public.colleges
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Only admins can update colleges"
  ON public.colleges
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "Only admins can delete colleges"
  ON public.colleges
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Seed colleges
INSERT INTO public.colleges (name, lat, lon) VALUES
  ('Fourah Bay College', 8.477917, -13.221056),
  ('IPAM Tower Hill', 8.484611, -13.230917),
  ('Limkokwing', 8.451639, -13.238417)
ON CONFLICT DO NOTHING;
