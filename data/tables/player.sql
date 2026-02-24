create table public.player
(
    id           uuid    not null default gen_random_uuid(),
    name         text null default 'Player'::text,
    credits      integer not null default 20,
    intel        integer not null default 0,
    heat         integer not null default 0,
    role         text null,
    max_credits  integer not null default 100,
    max_intel    integer not null default 250,
    legal_advice boolean not null default false,
    constraint player_pkey primary key (id),
    constraint player_id_fkey foreign KEY (id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
