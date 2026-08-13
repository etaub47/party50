create table public.event (
    id       uuid not null default gen_random_uuid(),
    type     text null,
    intel    integer null default 0,
    description  text null,
    heat     integer null default 0,
    credits      integer null default 0,
    challenge_id text null,
    step     integer null,
    constraint event_step_pkey primary key (id)
);

INSERT INTO public.event(id, type, intel, heat, credits, description, challenge_id, step) VALUES

    -- terminal_b_drop (Step 2: Scan vs Flee)
    ('073f71c6-170c-4030-aa8d-568b2eed5e97', 'CONSEQUENCE', 4, 3, 0, 'The team remained stationary to execute a deep local scan, uncovering peripheral data but increasing network visibility.', 'terminal_b_drop', 2),
    ('99a62e3c-2ac1-42f3-9ec7-1e1b2340c4ac', 'CONSEQUENCE', 0, 0, 0, 'The team immediately severed the link and evacuated the sector, avoiding detection protocols entirely.', 'terminal_b_drop', 2),

    -- compliance_gamble (Step 2: Clone vs Purge)
    ('4ee70714-c977-42b3-9fe9-b6816c64e194', 'CONSEQUENCE', 5, 4, 0, 'The team cloned the un-redacted historical financial archives, preserving high-value context at the cost of triggering a defensive alert loop.', 'compliance_gamble', 2),
    ('c10b4ef5-38aa-4b58-9c04-a4f6e8911f3f', 'CONSEQUENCE', 0, -5, 0, 'The team executed a complete wipe of the server logs, scrubbed their own operational footprints, and significantly reduced active heat.', 'compliance_gamble', 2),

    -- park_bench_drop (Step 2: Drop vs Keep)
    ('f0fd022d-4716-44de-b63b-ccdffff8719a', 'CONSEQUENCE', 0, 0, 10, 'The team discreetly ditched the primary hardware asset to pass a routine corporate checkpoint smoothly, pocketing a low-level routing courier fee.', 'park_bench_drop', 2),
    ('28a889d6-aa7b-45be-8e3f-f33c0ae1a10c', 'CONSEQUENCE', 3, 5, 0, 'The team smuggled the field terminal out under high security pressure, yielding early strategic metrics but leaving an active tracking trace.', 'park_bench_drop', 2),

    -- shell_entity (Step 1: Wire vs Freeze)
    ('9c8e9a81-1e38-448d-8f83-867ac66a3506', 'CONSEQUENCE', 0, 3, 15, 'The team routed a rapid capital diversion to a temporary node, securing liquidity but registering a transaction alert flag on the network.', 'shell_entity', 1),
    ('c3e9858e-bcbc-48ef-87ab-ef0582dc5147', 'CONSEQUENCE', 4, 0, 0, 'The team entirely froze the target accounting node, locking down raw operational infrastructure records for secure data assessment.', 'shell_entity', 1),

    -- server_room_sprint (Step 1: Cut vs Vent)
    ('27ad280f-7c3f-4e43-87ae-c9de02ce869e', 'CONSEQUENCE', 0, 2, 0, 'The team forcibly severed the backup power lines, plunging the sector into darkness and easing physical bypass operations.', 'server_room_sprint', 1),
    ('7235224d-f63b-4243-a0f9-3bc7cf546feb', 'CONSEQUENCE', 0, 5, 0, 'The team triggered a manual coolant pressure vent, lowering hardware performance caps but tripping localized environment alarms.', 'server_room_sprint', 1),

    -- laundromat_drop (Step 2: Wait vs Leave)
    ('3029a57c-5801-4cdf-a795-61cb6932ee67', 'CONSEQUENCE', 3, 4, 0, 'The team stayed at the transfer point to confirm the secondary courier identity, adding structural metrics but lingering too long under camera feeds.', 'laundromat_drop', 2),
    ('ca29a8b6-60eb-4905-83fc-2c1829c289e2', 'CONSEQUENCE', 0, 0, 5, 'The team initiated an immediate hand-off and split up, recovering a baseline delivery stipend cleanly without additional surveillance footprint.', 'laundromat_drop', 2),

    -- cleaning_crew_shift (Step 1: Bribe vs Dodge)
    ('9a533b7f-b2d4-4d59-9b33-d678ce45f719', 'CONSEQUENCE', 0, 0, -10, 'The team spent liquid funds to pay off a late-shift facilities worker, securing an un-monitored window into the workspace.', 'cleaning_crew_shift', 1),
    ('ee00cc80-2505-43fa-bfb4-86e019de96e5', 'CONSEQUENCE', 0, 6, 0, 'The team manually ducked security patrols, burning operational time and narrowly evading an automated motion scanner grid.', 'cleaning_crew_shift', 1);

INSERT INTO public.event (id, description, heat, intel, credits, type)
VALUES
    ('c001da01-0000-4000-8000-000000000001', 'You have maintained a low profile.', -8, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000002', 'You have maintained a low profile.', -8, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000003', 'You have maintained a low profile.', -8, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000004', 'You have maintained a low profile.', -8, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000005', 'You have maintained a low profile.', -8, 0, 0, 'COOLDOWN'),
    ('c001da01-0000-4000-8000-000000000006', 'You have maintained a low profile.', -8, 0, 0, 'COOLDOWN');

-- global events
INSERT INTO public.event (description, heat, intel, credits, type)
VALUES
    ('Your contact wired you some credits to help fund your mission.', 0, 0, 50, 'CONSEQUENCE'),
    ('You were unable to meet up with your contact in time.', 0, 0, 0, 'CONSEQUENCE'),
    ('You overheard an important business conversation and recorded it on tape.', 0, 25, 0, 'CONSEQUENCE'),
    ('You missed a key conversation while you were fumbling with the wire tap.', 0, 0, 0, 'CONSEQUENCE'),
    ('You were able to stash evidence of your tampering before the shakedown.', -15, 0, 0, 'CONSEQUENCE'),
    ('You were caught red-handed with some incriminating proof of your tampering.', 10, 0, 0, 'CONSEQUENCE');
