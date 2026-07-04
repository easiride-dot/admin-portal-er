-- Add verification status and ID photo URL to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS student_id_url text;

-- Create a bucket for student IDs if it doesn't exist
-- Note: This requires the storage extension to be enabled
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-ids', 'student-ids', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for student-ids
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'student-ids' );

CREATE POLICY "Authenticated users can upload IDs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'student-ids' );

CREATE POLICY "Users can update their own IDs" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'student-ids' AND auth.uid() = owner );
