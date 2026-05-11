CREATE OR REPLACE FUNCTION apply_missed_global_penalties()
    RETURNS TABLE (event_title TEXT) AS $$
DECLARE
    v_player_id UUID;
    v_record RECORD;
BEGIN
    v_player_id := auth.uid();

    -- only proceed if we have a valid user
    IF v_player_id IS NULL THEN
        RETURN;
    END IF;

    FOR v_record IN
        SELECT ge.id, ge.title, ge.failure_event_id
        FROM public.global_event ge
        WHERE ge.expires_at < NOW()
          AND NOT EXISTS (
            SELECT 1 FROM public.global_event_participation gep
            WHERE gep.global_event_id = ge.id AND gep.player_id = v_player_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.player_event pe
            WHERE pe.player_id = v_player_id AND pe.event_id = ge.failure_event_id
          )
        LOOP
            -- apply the penalty to the ledger
            INSERT INTO public.player_event (player_id, event_id)
            VALUES (v_player_id, v_record.failure_event_id);

            -- mark as participated so they aren't penalized again
            INSERT INTO public.global_event_participation (global_event_id, player_id)
            VALUES (v_record.id, v_player_id);

            -- return the title to the frontend for the alert
            event_title := v_record.title;
            RETURN NEXT;
        END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
