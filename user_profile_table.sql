create table public.profiles (
  id uuid not null,
  first_name text null,
  last_name text null,
  profile_color text null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;