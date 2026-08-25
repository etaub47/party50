-- Full wipe back to PRE_GAME. Guard mirrors start_game/end_game: the UPDATE's
-- WHERE clause is both the transition check and the idempotency check, so a
-- repeat call (double-tap, retry) finds status already PRE_GAME, matches no
-- row, and skips the wipe below entirely.
CREATE OR REPLACE FUNCTION reset_game()
    RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE game_state SET status = 'PRE_GAME', updated_at = NOW()
        WHERE id = 1 AND status = 'POST_GAME';
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        RETURN FALSE;
    END IF;

    -- Every player-owned table (player_challenge, player_vote, player_attempt,
    -- player_item, player_event, lawyer_advice, global_event_participation)
    -- cascades from this delete. auth.users is left alone on purpose --
    -- registration is keyed off each device's existing anonymous auth
    -- session, so players just re-register clean next game.
    -- `WHERE true` on these two: Supabase's safeupdate guard rejects a bare
    -- DELETE with no WHERE clause at all, even one that's genuinely meant to
    -- clear the whole table.
    DELETE FROM player WHERE true;

    -- global_event only ever references the reusable CONSEQUENCE catalog
    -- rows (kept below), so this is safe in any order relative to the event
    -- delete that follows.
    DELETE FROM global_event WHERE true;

    -- Bespoke, per-action events. CONSEQUENCE (mission step outcomes, global
    -- event catalog) and COOLDOWN (cron-triggered) are reusable catalog rows
    -- and are deliberately left in place.
    DELETE FROM event WHERE type IN ('TRANSFER', 'LEGAL', 'CONVERSION');

    -- item catalog is untouched -- items are never wiped by Reset.

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
