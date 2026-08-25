-- Reverses an accidental End Game. Flips POST_GAME back to IN_GAME and
-- undoes the credit->intel conversion end_game() inserted. Cannot restore
-- player_challenge rows end_game() hard-deleted for teams that were
-- mid-mission -- those teams just rejoin from scratch. Accepted tradeoff,
-- see party50-game-lifecycle-design memory.
CREATE OR REPLACE FUNCTION undo_end_game()
    RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE game_state SET status = 'IN_GAME', updated_at = NOW()
        WHERE id = 1 AND status = 'POST_GAME';
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        RETURN FALSE;
    END IF;

    DELETE FROM player_event WHERE event_id IN (
        SELECT id FROM event WHERE type = 'CONVERSION'
    );
    DELETE FROM event WHERE type = 'CONVERSION';

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
