create table public.event
(
    id          uuid not null default gen_random_uuid(),
    type        text null,
    intel       integer null default 0,
    description text null,
    heat        integer null,
    credits     integer null,
    constraint event_step_pkey primary key (id)
) TABLESPACE pg_default;
