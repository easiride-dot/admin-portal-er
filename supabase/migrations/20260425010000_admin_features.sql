-- Add 'in_progress' to ride_status enum
-- Note: This might need to be run outside a transaction or handled specifically by Supabase
ALTER TYPE public.ride_status ADD VALUE IF NOT EXISTS 'in_progress';

-- Add payment_status to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    target_id uuid,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Policies for admin_logs
CREATE POLICY "Admins can view all logs"
    ON public.admin_logs FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs"
    ON public.admin_logs FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
