CREATE TABLE player_vote (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id TEXT NOT NULL,
    team_id      UUID NOT NULL,
    player_id    UUID NOT NULL REFERENCES player (id) ON DELETE CASCADE,
    step         INT  NOT NULL,
    option_id    TEXT NOT NULL,
    created_at   TIMESTAMPTZ      DEFAULT now(),
    UNIQUE (player_id, team_id, step),
    constraint player_vote_player_id_fkey foreign KEY (player_id) references player (id)
        on update cascade on delete cascade
);

ALTER TABLE player_vote REPLICA IDENTITY FULL;
ALTER TABLE player_vote ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime add table player_vote;

CREATE POLICY player_vote_insert_own
    ON player_vote
    AS PERMISSIVE FOR INSERT
    TO anon, authenticated
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY player_vote_select_team
    ON player_vote
    AS PERMISSIVE FOR SELECT
    TO anon, authenticated
    USING (team_id IN (SELECT get_my_team_ids() AS get_my_team_ids));

CREATE POLICY player_vote_delete_team
    ON player_vote
    AS PERMISSIVE FOR DELETE
    TO anon, authenticated
    USING (team_id IN (SELECT get_my_team_ids() AS get_my_team_ids));
