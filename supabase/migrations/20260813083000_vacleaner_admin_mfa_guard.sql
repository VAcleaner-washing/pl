drop function if exists public.vacleaner_admin_has_verified_mfa();

create or replace function public.vacleaner_admin_mfa_required(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    join auth.mfa_factors mf on mf.user_id = au.user_id
    where au.user_id = p_user_id
      and mf.status = 'verified'
  );
$$;

revoke all on function public.vacleaner_admin_mfa_required(uuid) from public, anon, authenticated;
grant execute on function public.vacleaner_admin_mfa_required(uuid) to service_role;
