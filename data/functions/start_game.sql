CREATE OR REPLACE FUNCTION start_game()
    RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    -- the WHERE clause is both the transition guard and the idempotency check:
    -- a repeat call finds status already IN_GAME and matches no row.
    UPDATE game_state SET status = 'IN_GAME', updated_at = NOW()
        WHERE id = 1 AND status = 'PRE_GAME';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
