-- Finalize verification logic: 
-- Only students should have 'pending' verification. 
-- Admins (or anyone else) should be 'approved' by default.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  -- Check if the user is intended to be an admin (e.g. from meta_data)
  is_admin := (new.raw_user_meta_data ->> 'role') = 'admin';

  insert into public.profiles (
    id, 
    full_name, 
    phone, 
    student_id_url, 
    verification_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone, ''),
    coalesce(new.raw_user_meta_data ->> 'student_id_url', ''),
    case when is_admin then 'approved' else 'pending' end
  );

  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'admin'::public.app_role else 'student'::public.app_role end);

  return new;
end;
$$;
