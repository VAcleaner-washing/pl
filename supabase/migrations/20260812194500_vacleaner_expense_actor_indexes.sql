-- Cover audit actor foreign keys reported by the database advisor.
create index if not exists vacleaner_expenses_created_by_idx on public.vacleaner_expenses(created_by);
create index if not exists vacleaner_expenses_updated_by_idx on public.vacleaner_expenses(updated_by);
create index if not exists vacleaner_expenses_archived_by_idx on public.vacleaner_expenses(archived_by) where archived_by is not null;
