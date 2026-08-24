CREATE OR REPLACE FUNCTION purchase_item_with_discount(
    p_player_id UUID,
    p_item_id UUID,
    p_player_role TEXT   -- kept for call-site compatibility; deliberately ignored, see below
) RETURNS VOID AS $$
DECLARE
    v_item_cost INTEGER;
    v_current_credits INTEGER;
    v_player_role TEXT;
BEGIN
    PERFORM assert_game_in_progress();

    -- Serialise concurrent purchases by the same player. The balance is derived from
    -- inventory, so a plain read-then-insert lets two purchases in flight at once both
    -- see the pre-purchase balance and both succeed. Buying the same item twice is
    -- already stopped by player_item_pkey; this covers two different items at once.
    PERFORM 1 FROM player WHERE id = p_player_id FOR UPDATE;

    -- Trust the stored role, not the caller's copy of it. player_stats computes the
    -- Bargain Hunter discount from player.role, so pricing the check off a
    -- client-supplied role lets the two disagree: a caller claiming 'Bargain Hunter'
    -- passes the check at 70% while the view still charges full price, which can push
    -- the balance negative. Reading it here keeps check and charge on one source.
    SELECT COALESCE(role, '') INTO v_player_role FROM player WHERE id = p_player_id;

    SELECT cost INTO v_item_cost FROM item WHERE id = p_item_id;
    IF v_item_cost IS NULL THEN
        RAISE EXCEPTION 'Unknown item';
    END IF;

    IF v_player_role = 'Bargain Hunter' THEN
        v_item_cost := floor(v_item_cost * 0.7);
    END IF;

    SELECT current_credits INTO v_current_credits
    FROM player_stats
    WHERE id = p_player_id;

    -- Without this, a missing row leaves v_current_credits NULL and `NULL < cost`
    -- evaluates to NULL, so the affordability check below would fall through.
    IF v_current_credits IS NULL THEN
        RAISE EXCEPTION 'Unknown player';
    END IF;

    IF v_current_credits < v_item_cost THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    INSERT INTO player_item (player_id, item_id) VALUES (p_player_id, p_item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
