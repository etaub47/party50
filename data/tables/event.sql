create table public.event (
    id           uuid not null default gen_random_uuid(),
    type         text null,
    intel        integer null default 0,
    description  text null,
    heat         integer null default 0,
    credits      integer null default 0,
    challenge_id text null,
    step         integer null,
    constraint event_step_pkey primary key (id)
);

INSERT INTO public.event(type, intel, heat, credits, description, challenge_id, step) VALUES
    ('CONSEQUENCE', 0, 5, 0, 'You were nearly caught when you sprinted for the exit', 'vault_breach', 2);

INSERT INTO public.event (id, description, heat, intel, credits, type)
VALUES
    ('c001da01-0000-4000-8000-000000000001', 'You have maintained a low profile.', -10, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000002', 'You have maintained a low profile.', -10, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000003', 'You have maintained a low profile.', -10, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000004', 'You have maintained a low profile.', -10, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000005', 'You have maintained a low profile.', -10, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000006', 'You have maintained a low profile.', -10, 0, 0, 'COOLDOWN');
