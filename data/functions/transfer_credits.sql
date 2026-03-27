CREATE OR REPLACE FUNCTION transfer_credits(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount INTEGER,
    p_sender_name TEXT,
    p_receiver_name TEXT
) RETURNS VOID AS $$
DECLARE
    v_sender_balance INTEGER;
    v_debit_event_id UUID := gen_random_uuid();
    v_credit_event_id UUID := gen_random_uuid();
BEGIN
    -- 1. Security Check: Prevent self-transfers
    IF p_sender_id = p_receiver_id THEN
        RAISE EXCEPTION 'Internal loop detected: Cannot transfer to self.';
    END IF;

    -- 2. Check Sender's current balance from our View
    SELECT current_credits INTO v_sender_balance
    FROM player_stats
    WHERE id = p_sender_id;

    IF v_sender_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient credits for transfer.';
    END IF;

    -- 3. Create the DEBIT Event (The Outbound Wire)
    INSERT INTO event (id, description, credits, type)
    VALUES (
               v_debit_event_id,
               'Transferred ' || p_amount || ' credits to ' || p_receiver_name,
               -p_amount,
               'TRANSFER'
           );

    -- 4. Create the CREDIT Event (The Inbound Wire)
    INSERT INTO event (id, description, credits, type)
    VALUES (
               v_credit_event_id,
               'Received ' || p_amount || ' credits from ' || p_sender_name,
               p_amount,
               'TRANSFER'
           );

    -- 5. Link events to players in the ledger
    INSERT INTO player_event (player_id, event_id) VALUES (p_sender_id, v_debit_event_id);
    INSERT INTO player_event (player_id, event_id) VALUES (p_receiver_id, v_credit_event_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
