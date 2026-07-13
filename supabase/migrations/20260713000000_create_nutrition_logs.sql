create table if not exists public.nutrition_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    date date not null default current_date,
    calories integer,
    protein integer,
    carbs integer,
    fat integer,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.nutrition_logs enable row level security;

create policy "Users can insert their own nutrition logs"
    on public.nutrition_logs for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own nutrition logs"
    on public.nutrition_logs for select
    using (auth.uid() = user_id);

create policy "Users can update their own nutrition logs"
    on public.nutrition_logs for update
    using (auth.uid() = user_id);

create policy "Users can delete their own nutrition logs"
    on public.nutrition_logs for delete
    using (auth.uid() = user_id);
