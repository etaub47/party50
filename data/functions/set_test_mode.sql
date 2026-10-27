-- Switches testing mode. Deliberately one-sided: switching it ON is only
-- allowed in PRE_GAME, so a live game can never be relaxed by accident, but
-- switching it OFF is allowed any time, since that only makes the game
-- stricter. Returns FALSE when the WHERE clause matched no row (ON outside
-- PRE_GAME), mirroring start_game/end_game.
CREATE OR REPLACE FUNCTION set_test_mode(p_enabled BOOLEAN)
    RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE game_state SET test_mode = p_enabled, updated_at = NOW()
        WHERE id = 1 AND (NOT p_enabled OR status = 'PRE_GAME');
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
