create table if not exists public.nutrition_plans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    plan jsonb not null,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.nutrition_plans enable row level security;

create policy "Users can insert their own nutrition plans"
    on public.nutrition_plans for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own nutrition plans"
    on public.nutrition_plans for select
    using (auth.uid() = user_id);

create policy "Users can update their own nutrition plans"
    on public.nutrition_plans for update
    using (auth.uid() = user_id);
