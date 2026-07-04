-- Update storage permissions to ensure admins can see the images
-- PostgREST/Supabase sometimes needs explicit select permission on storage.objects

CREATE POLICY "Admin full access to student IDs" 
ON storage.objects FOR ALL 
TO authenticated 
USING ( bucket_id = 'student-ids' );

-- Ensure the profiles table has a direct foreign key for easy selection if needed, 
-- though it's already there from previous migration.

-- Force public schema cache refresh for the relationship
NOTIFY pgrst, 'reload schema';
