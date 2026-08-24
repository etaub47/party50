CREATE OR REPLACE FUNCTION join_challenge(
    p_player_id UUID,
    p_challenge_id TEXT,
    p_min_players INTEGER
) RETURNS TABLE (result_code TEXT, out_team_id UUID, out_status TEXT) AS $$
DECLARE
    v_is_locked_out BOOLEAN;
    v_active_status TEXT;
    v_prior_status TEXT;
    v_prior_team_id UUID;
    v_team_id UUID;
BEGIN
    IF current_game_status() != 'IN_GAME' THEN
        RETURN QUERY SELECT 'GAME_NOT_ACTIVE'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF p_min_players IS NULL OR p_min_players < 1 THEN
        RAISE EXCEPTION 'Invalid team size';
    END IF;

    -- Serialise every join for this mission. Two agents scanning the same QR at the same
    -- moment both used to read "no WAITING team" and mint their own team_id, leaving two
    -- one-person teams that never fill. There is no challenge table to lock -- missions are
    -- JSON files keyed by a text id -- so lock on the id itself for this transaction.
    PERFORM pg_advisory_xact_lock(hashtext(p_challenge_id));

    -- This player's own record for this same mission, if any. player_challenge is unique on
    -- (player_id, challenge_id), so there is at most one.
    SELECT team_id, status INTO v_prior_team_id, v_prior_status
    FROM player_challenge
    WHERE player_id = p_player_id
      AND challenge_id = p_challenge_id;

    -- Already in this mission: hand back the same team rather than refusing. Scanning the
    -- QR twice, or reopening the app mid-mission, has to put the agent back where they were.
    -- Refusing here also made a harmless double submit from the scan page look like a bug.
    IF v_prior_status IN ('WAITING', 'IN_PROGRESS') THEN
        RETURN QUERY SELECT 'OK'::text, v_prior_team_id, v_prior_status;
        RETURN;
    END IF;

    -- A terminal record for this same mission means no second attempt. Checked before the
    -- heat lockout so the agent is told what actually stops them.
    IF v_prior_status = 'COMPLETED' THEN
        RETURN QUERY SELECT 'ALREADY_COMPLETED'::text, NULL::uuid, NULL::text;
        RETURN;
    ELSIF v_prior_status = 'FAILED' THEN
        RETURN QUERY SELECT 'ALREADY_FAILED'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- Read the lockout server-side. The caller supplies p_player_id, so nothing about the
    -- player's heat may come from the client. Note this gates *joining*: an agent already in
    -- a mission when their heat crossed 100 resumes it above.
    SELECT is_locked_out INTO v_is_locked_out FROM player_stats WHERE id = p_player_id;

    IF v_is_locked_out IS NULL THEN
        RETURN QUERY SELECT 'UNKNOWN_PLAYER'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_is_locked_out THEN
        RETURN QUERY SELECT 'LOCKED_OUT'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- Busy with a *different* mission. one_active_mission_per_player enforces this as well,
    -- but checking here turns a constraint violation into a readable overlay.
    SELECT status INTO v_active_status
    FROM player_challenge
    WHERE player_id = p_player_id
      AND challenge_id <> p_challenge_id
      AND status IN ('WAITING', 'IN_PROGRESS')
    LIMIT 1;

    IF v_active_status IS NOT NULL THEN
        RETURN QUERY SELECT 'ACTIVE_MISSION'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- Join the oldest team for this mission that is still short of min_players and has not
    -- started. A team at capacity is deliberately not offered: the mission begins as soon as
    -- it is full, so a later scanner has to seed a new team rather than land in a trio that
    -- is already under way. Clients flip their own row to IN_PROGRESS one at a time, so a
    -- team mid-start has a mix of statuses -- any non-WAITING row disqualifies it.
    SELECT pc.team_id INTO v_team_id
    FROM player_challenge pc
    WHERE pc.challenge_id = p_challenge_id
    GROUP BY pc.team_id
    HAVING COUNT(*) < p_min_players
       AND COUNT(*) FILTER (WHERE pc.status <> 'WAITING') = 0
    ORDER BY MIN(pc.created_at)
    LIMIT 1;

    IF v_team_id IS NULL THEN
        v_team_id := gen_random_uuid();
    END IF;

    INSERT INTO player_challenge (player_id, challenge_id, team_id, status)
    VALUES (p_player_id, p_challenge_id, v_team_id, 'WAITING');

    RETURN QUERY SELECT 'OK'::text, v_team_id, 'WAITING'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
