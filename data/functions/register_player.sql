CREATE OR REPLACE FUNCTION register_player(
    p_player_id UUID,
    p_name TEXT,
    p_role TEXT
) RETURNS SETOF player AS $$
DECLARE
    v_role_count INTEGER;
    v_max_other_count INTEGER;
BEGIN
    -- SECURITY DEFINER bypasses the player table's RLS policies, so the game-status gate
    -- that used to live in player_allow_anonymous_insert has to be re-checked here.
    IF current_game_status() = 'POST_GAME' THEN
        RAISE EXCEPTION 'Registration is closed -- the game is not currently accepting new agents.';
    END IF;

    -- Serialise registrations so two agents signing up at the same instant can't both pass
    -- the role-balance check for a role that only has room for one more.
    PERFORM pg_advisory_xact_lock(hashtext('player_registration'));

    SELECT COUNT(*) INTO v_role_count FROM player WHERE role = p_role;

    -- The runner-up: the biggest count among every OTHER role. Comparing against that
    -- (instead of a fixed cap) is what lets this work without knowing headcount in advance --
    -- one dominant role gets capped, but a role everyone ignores never blocks anyone.
    SELECT COALESCE(MAX(cnt), 0) INTO v_max_other_count
    FROM (
        SELECT COUNT(*) AS cnt
        FROM player
        WHERE role IS NOT NULL AND role <> p_role
        GROUP BY role
    ) other_role_counts;

    IF v_role_count - v_max_other_count >= 4 THEN
        RAISE EXCEPTION '% has too big a lead over the other roles right now. Pick a different role -- % opens back up once another role catches up.', p_role, p_role;
    END IF;

    RETURN QUERY
    INSERT INTO player (id, name, role)
    VALUES (p_player_id, p_name, p_role)
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
