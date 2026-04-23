CREATE OR REPLACE FUNCTION recover_player_identity(target_player_id UUID)
    RETURNS VOID AS $$
DECLARE
    new_phone_uid UUID;
BEGIN
    -- get the current Auth ID from the session
    new_phone_uid := auth.uid();

    -- if for some reason we don't have an auth session, stop.
    IF new_phone_uid IS NULL THEN
        RAISE EXCEPTION 'No active session detected.';
    END IF;

    -- if we are already the target, we are done.
    IF new_phone_uid = target_player_id THEN
        RETURN;
    END IF;

    -- REMOVE any 'placeholder' player record that the new phone just created.
    -- this clears the path so we can 'rename' the old record to this ID.
    DELETE FROM public.player WHERE id = new_phone_uid;

    -- rename the target player to the new session ID.
    -- because our foreign keys are ON UPDATE CASCADE, every item/event follows.
    UPDATE public.player
    SET id = new_phone_uid
    WHERE id = target_player_id;

    -- if no rows were updated, it means the target_player_id was invalid.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target player identity not found.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
