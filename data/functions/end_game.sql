CREATE OR REPLACE FUNCTION end_game()
    RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
    v_player RECORD;
    v_convert_intel INTEGER;
    v_event_id UUID;
BEGIN
    -- Transition guard doubles as the idempotency check: a repeat call (double
    -- tap, retry) finds status already POST_GAME and matches no row, so none
    -- of the abort/conversion logic below runs a second time.
    UPDATE game_state SET status = 'POST_GAME', updated_at = NOW()
        WHERE id = 1 AND status = 'IN_GAME';
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        RETURN FALSE;
    END IF;

    -- Abort every active mission, waiting-room and in-progress alike. The
    -- existing MissionRunner realtime DELETE listener (already used by the
    -- voluntary "Abort Mission" button) turns this into the same
    -- "MISSION TERMINATED" overlay for every affected player.
    DELETE FROM player_challenge WHERE status IN ('WAITING', 'IN_PROGRESS');

    -- One-off credit -> intel conversion, personalized per player. Recorded as
    -- a freshly generated event row per player rather than a balance UPDATE,
    -- since current_credits/total_intel are computed ledger sums, never
    -- mutable columns (see player_stats). Floor-rounded 10:1; a player whose
    -- converted intel would still be capped by max_intel gets it anyway --
    -- that's intentional, not a bug (see party50-game-lifecycle-design memory).
    FOR v_player IN SELECT id, current_credits FROM player_stats WHERE current_credits > 0 LOOP
        v_convert_intel := v_player.current_credits / 10; -- integer division floors for positive values

        IF v_convert_intel > 0 THEN
            INSERT INTO event (description, intel, heat, credits, type)
            VALUES (
                'End-of-game asset liquidation: spare credits converted to intel.',
                v_convert_intel,
                0,
                -v_player.current_credits,
                'CONVERSION'
            ) RETURNING id INTO v_event_id;

            INSERT INTO player_event (player_id, event_id) VALUES (v_player.id, v_event_id);
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
