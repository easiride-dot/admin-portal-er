-- Link Subscriptions to Profiles (Students)
-- This allows Supabase to automatically join subscriptions and profiles
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey,
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;
