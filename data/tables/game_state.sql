CREATE TABLE game_state (
    id         SMALLINT    PRIMARY KEY DEFAULT 1,
    status     TEXT        NOT NULL DEFAULT 'PRE_GAME' CHECK (status IN ('PRE_GAME', 'IN_GAME', 'POST_GAME')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT game_state_singleton CHECK (id = 1)
);

INSERT INTO game_state (id, status) VALUES (1, 'PRE_GAME');

ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Everyone may read the current phase; only the SECURITY DEFINER transition
-- functions (start_game / end_game / reset_game) are allowed to change it.
CREATE POLICY game_state_view_all
    ON game_state
    AS PERMISSIVE FOR SELECT
    TO anon, authenticated
    USING (true);
