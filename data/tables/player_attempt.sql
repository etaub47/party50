create table public.player_attempt (
    player_id     uuid null,
    challenge_id  text not null,
    attempts_used INT DEFAULT 0,
    constraint player_attempt_pkey primary key (player_id, challenge_id),
    constraint player_attempt_player_id_fkey foreign KEY (player_id) references player (id)
        on update cascade on delete cascade
);

ALTER TABLE player_attempt REPLICA IDENTITY FULL;
ALTER TABLE player_attempt ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime add table player_attempt;

CREATE POLICY player_attempt_select_own
    ON player_attempt
    AS PERMISSIVE FOR SELECT
    TO anon, authenticated
    USING (auth.uid() = player_id);

CREATE POLICY player_attempt_insert_own
    ON player_attempt
    AS PERMISSIVE FOR INSERT
    TO anon, authenticated
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY player_attempt_update_own
    ON player_attempt
    AS PERMISSIVE FOR UPDATE
    TO anon, authenticated
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);
