CREATE OR REPLACE FUNCTION purchase_item_with_discount(
  p_player_id UUID,
  p_item_id UUID,
  p_player_role TEXT
) RETURNS VOID AS $$
DECLARE
v_item_cost INTEGER;
  v_player_credits INTEGER;
BEGIN

-- 1. Get the original item cost
SELECT cost INTO v_item_cost FROM item WHERE id = p_item_id;

-- 2. Apply discount if applicable
IF p_player_role = 'Bargain Hunter' THEN
    v_item_cost := floor(v_item_cost * 0.7);
END IF;

-- 3. Get current player credits
SELECT credits INTO v_player_credits FROM player WHERE id = p_player_id FOR UPDATE;

-- 4. Check for enough credits
IF v_player_credits < v_item_cost THEN
    RAISE EXCEPTION 'Insufficient credits';
END IF;

-- 5. Deduct credits
UPDATE player SET credits = credits - v_item_cost WHERE id = p_player_id;

-- 6. Add the item
INSERT INTO player_item (player_id, item_id) VALUES (p_player_id, p_item_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
