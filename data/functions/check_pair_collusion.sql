CREATE OR REPLACE FUNCTION check_pair_collusion(p_team_id UUID)
    RETURNS BOOLEAN AS $$
DECLARE
    v_current_player_ids UUID[];
    v_p1 UUID;
    v_p2 UUID;
    v_prior_pair_count INTEGER;
BEGIN
    -- identify the players currently assigned to this team_id
    SELECT array_agg(player_id ORDER BY player_id)
    INTO v_current_player_ids
    FROM public.player_challenge
    WHERE team_id = p_team_id;

    IF array_length(v_current_player_ids, 1) < 2 THEN
        RETURN FALSE;
    END IF;

    -- check every pair within the current team: has this exact pair already
    -- reached the cap of 4 prior terminal (COMPLETED/FAILED) teams together?
    -- Team size can exceed 3 (p_min_players varies by mission), so this is
    -- checked pairwise rather than against the whole roster at once.
    FOR i IN 1..array_length(v_current_player_ids, 1) LOOP
        FOR j IN i + 1..array_length(v_current_player_ids, 1) LOOP
            v_p1 := v_current_player_ids[i];
            v_p2 := v_current_player_ids[j];

            SELECT COUNT(*)
            INTO v_prior_pair_count
            FROM (
                SELECT pc.team_id
                FROM public.player_challenge pc
                WHERE pc.status IN ('COMPLETED', 'FAILED')
                  AND pc.team_id != p_team_id
                  AND pc.player_id IN (v_p1, v_p2)
                GROUP BY pc.team_id
                HAVING COUNT(DISTINCT pc.player_id) = 2
            ) prior_pair_teams;

            IF v_prior_pair_count >= 4 THEN
                RETURN TRUE;
            END IF;
        END LOOP;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
