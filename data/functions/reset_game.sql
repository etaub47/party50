-- Testing-only for now: just flips the state back so the lifecycle can be
-- re-run. What else Reset should do (wiping player data, archiving results
-- for cross-party history) is a separate future TODO, deliberately not here.
CREATE OR REPLACE FUNCTION reset_game()
    RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE game_state SET status = 'PRE_GAME', updated_at = NOW()
        WHERE id = 1 AND status = 'POST_GAME';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
