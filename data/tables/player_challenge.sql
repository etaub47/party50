create table public.player_challenge (
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
);

ALTER TABLE player_challenge REPLICA IDENTITY FULL;
ALTER TABLE player_challenge ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime add table player_challenge;

CREATE POLICY player_challenge_insert_own
    ON player_challenge
    AS PERMISSIVE FOR INSERT
    TO anon, authenticated
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY player_challenge_all_team
    ON player_challenge
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (team_id IN (SELECT get_my_team_ids() AS get_my_team_ids));

CREATE POLICY player_challenge_lobby_view
    ON player_challenge
    AS PERMISSIVE FOR SELECT
    TO anon, authenticated
    USING (status = 'WAITING'::text);
