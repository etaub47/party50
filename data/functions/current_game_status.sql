CREATE OR REPLACE FUNCTION current_game_status()
    RETURNS TEXT AS $$
    SELECT status FROM game_state WHERE id = 1;
$$ LANGUAGE sql STABLE;
