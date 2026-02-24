CREATE OR REPLACE FUNCTION purchase_item_with_discount(
  p_player_id UUID,
  p_item_id UUID,
  p_player_role TEXT
) RETURNS VOID AS $$
DECLARE
  v_item_cost INTEGER;
  v_player_credits INTEGER;
BEGIN

  SELECT cost INTO v_item_cost FROM item WHERE id = p_item_id;

  IF p_player_role = 'Bargain Hunter' THEN
    v_item_cost := floor(v_item_cost * 0.7);
  END IF;

  SELECT credits INTO v_player_credits FROM player WHERE id = p_player_id FOR UPDATE;

  IF v_player_credits < v_item_cost THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE player SET credits = credits - v_item_cost WHERE id = p_player_id;

  INSERT INTO player_item (player_id, item_id) VALUES (p_player_id, p_item_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
