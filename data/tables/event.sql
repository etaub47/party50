create table public.event (
    id           uuid not null default gen_random_uuid(),
    type         text null,
    intel        integer null default 0,
    description  text null,
    heat         integer null,
    credits      integer null,
    challenge_id text null,
    step         integer null,
    constraint event_step_pkey primary key (id)
);

INSERT INTO public.event(type, intel, heat, credits, description, challenge_id, step) VALUES
    ('CONSEQUENCE', 0, 5, 0, 'You were nearly caught when you sprinted for the exit', 'vault_breach', 2);

