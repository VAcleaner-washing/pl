-- VAcleaner v3.0: focused performance fixes that do not touch VA HOME data models.
create index if not exists vacleaner_push_subscriptions_user_idx
  on public.vacleaner_push_subscriptions (user_id);

alter policy "Admins can read admin allowlist" on public.admin_users
  using (user_id = (select auth.uid()));
