CREATE OR REPLACE FUNCTION offer_legal_advice(
    p_lawyer_id UUID,
    p_recipient_id UUID,
    p_lawyer_name TEXT
) RETURNS VOID AS $$
DECLARE
    v_event_id UUID := gen_random_uuid();
    v_is_lawyer BOOLEAN;
    v_description TEXT;
BEGIN

    -- role check
    SELECT (role = 'Lawyer') INTO v_is_lawyer
      FROM player WHERE id = p_lawyer_id;
    IF NOT v_is_lawyer THEN
        RAISE EXCEPTION 'Unauthorized: Only a licensed Lawyer can provide legal advice.';
    END IF;

    -- each lawyer can only give advice once to each player
    INSERT INTO lawyer_advice (lawyer_id, recipient_id)
        VALUES (p_lawyer_id, p_recipient_id);

    -- custom description to handle self-advice
    IF p_lawyer_id = p_recipient_id THEN
        v_description := 'You took your own legal advice.';
    ELSE
        v_description := 'Received legal advice from ' || p_lawyer_name || '.';
    END IF;

    -- create the LEGAL Event (-10 Heat)
    INSERT INTO event (id, description, heat, type, credits, intel)
        VALUES (v_event_id, v_description, -10, 'LEGAL', 0, 0);

    -- link the event to the recipient's ledger
    INSERT INTO player_event (player_id, event_id)
        VALUES (p_recipient_id, v_event_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
