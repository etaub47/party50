CREATE OR REPLACE FUNCTION purchase_item_with_discount(
    p_player_id UUID,
    p_item_id UUID,
    p_player_role TEXT
) RETURNS VOID AS $$
DECLARE
    v_item_cost INTEGER;
    v_current_credits INTEGER;
BEGIN
    SELECT cost INTO v_item_cost FROM item WHERE id = p_item_id;
    IF p_player_role = 'Bargain Hunter' THEN
        v_item_cost := floor(v_item_cost * 0.7);
    END IF;

    SELECT current_credits INTO v_current_credits
    FROM player_stats
    WHERE id = p_player_id;

    IF v_current_credits < v_item_cost THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    INSERT INTO player_item (player_id, item_id) VALUES (p_player_id, p_item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
