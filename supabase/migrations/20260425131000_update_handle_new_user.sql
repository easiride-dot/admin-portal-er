-- Update handle_new_user to include student_id_url
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, student_id_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone, ''),
    coalesce(new.raw_user_meta_data ->> 'student_id_url', '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'student');

  return new;
end;
$$;
