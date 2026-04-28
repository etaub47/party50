CREATE OR REPLACE FUNCTION check_team_collusion(p_team_id UUID)
    RETURNS BOOLEAN AS $$
DECLARE
    v_current_player_ids UUID[];
    v_collusion_exists BOOLEAN;
BEGIN
    -- identify the players currently assigned to this team_id
    SELECT array_agg(player_id ORDER BY player_id)
    INTO v_current_player_ids
    FROM public.player_challenge
    WHERE team_id = p_team_id;

    -- if we don't have 3 players, return false
    IF array_length(v_current_player_ids, 1) < 3 THEN
        RETURN FALSE;
    END IF;

    -- check if this exact trio has a terminal status (COMPLETED/FAILED) under a DIFFERENT team_id
    SELECT EXISTS (
        SELECT 1
        FROM public.player_challenge pc
        WHERE pc.status IN ('COMPLETED', 'FAILED')
          AND pc.team_id != p_team_id -- ensure we aren't comparing the team to itself
        GROUP BY pc.team_id
        HAVING
                array_agg(pc.player_id ORDER BY pc.player_id) = v_current_player_ids
           AND count(pc.player_id) = 3
    ) INTO v_collusion_exists;

    RETURN v_collusion_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
