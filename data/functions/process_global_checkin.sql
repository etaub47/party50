CREATE OR REPLACE FUNCTION process_global_checkin(p_target_slug TEXT)
    RETURNS TABLE (
        success BOOLEAN,
        message TEXT
    ) AS $$
DECLARE
    v_log_record RECORD;
    v_player_id UUID;
BEGIN
    v_player_id := auth.uid();

    IF current_game_status() != 'IN_GAME' THEN
        RETURN QUERY SELECT FALSE, 'There is no active event for this location at this time.';
        RETURN;
    END IF;

    -- Serialise repeat check-ins from this same player for this same slug. A double-fired
    -- scan (or a re-scan while the first call is still in flight) used to pass every
    -- "already participated?" check before either INSERT committed, then both tried to
    -- INSERT into global_event_participation and the second died on the unique constraint
    -- with a raw duplicate-key error even though the first call had already succeeded.
    PERFORM pg_advisory_xact_lock(hashtext(p_target_slug || v_player_id::text));

    -- fetch the event details
    SELECT * INTO v_log_record
    FROM public.global_event
    WHERE target_scan_id = p_target_slug
    ORDER BY created_at DESC
    LIMIT 1;

    -- validation: does the event exist?
    IF v_log_record IS NULL THEN
        RETURN QUERY SELECT FALSE, 'There is no active event for this location at this time.';
        RETURN;
    END IF;

    -- validation: already participated?
    IF EXISTS (SELECT 1 FROM public.player_event WHERE event_id = v_log_record.success_event_id AND player_id = v_player_id) THEN
        RETURN QUERY SELECT TRUE, 'This objective was already completed successfully.';
        RETURN;
    END IF;

    -- validation: already participated?
    IF EXISTS (SELECT 1 FROM public.player_event WHERE event_id = v_log_record.failure_event_id AND player_id = v_player_id) THEN
        RETURN QUERY SELECT FALSE, 'This objective has already expired.';
        RETURN;
    END IF;

    -- validation: already participated?
    IF EXISTS (SELECT 1 FROM public.global_event_participation WHERE global_event_id = v_log_record.id AND player_id = v_player_id) THEN
        RETURN QUERY SELECT FALSE, 'This objective was already completed and recorded.';
        RETURN;
    END IF;

    -- record participation
    INSERT INTO public.global_event_participation (global_event_id, player_id)
    VALUES (v_log_record.id, v_player_id);

    -- validation: has it expired? if so, grant failure
    IF NOW() > v_log_record.expires_at THEN
        INSERT INTO public.player_event (player_id, event_id)
        VALUES (v_player_id, v_log_record.failure_event_id);
        RETURN QUERY SELECT FALSE, 'This event has expired. Sorry, you were too slow.';
        RETURN;
    END IF;

    -- grant rewards to the player record
    INSERT INTO public.player_event (player_id, event_id)
    VALUES (v_player_id, v_log_record.success_event_id);
    RETURN QUERY SELECT TRUE, 'You completed the objective within the time limit. Well done.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
