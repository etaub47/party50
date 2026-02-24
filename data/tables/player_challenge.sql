create table public.player_challenge
(
    id           uuid                     not null default gen_random_uuid(),
    player_id    uuid null,
    challenge_id text                     not null,
    team_id      uuid                     not null,
    status       text                     not null default 'WAITING'::text,
    current_step integer null default 1,
    created_at   timestamp with time zone not null default now(),
    constraint player_challenge_pkey primary key (id),
    constraint player_challenge_player_id_challenge_id_key unique (player_id, challenge_id),
    constraint player_challenge_player_id_fkey foreign KEY (player_id) references player (id) on delete CASCADE
) TABLESPACE pg_default;
