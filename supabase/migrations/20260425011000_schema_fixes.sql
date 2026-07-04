-- 1. Link Rides to Profiles (Students)
-- This allows Supabase to automatically join rides and profiles
ALTER TABLE public.rides
DROP CONSTRAINT IF EXISTS rides_user_id_fkey,
ADD CONSTRAINT rides_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. Add driver_id to Rides for proper relational tracking
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

-- 3. (Optional) Migrate existing driver data if possible, 
-- but since we are in dev, we can just start fresh or assign new rides.
