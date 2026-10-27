-- True while HQ has the game in testing mode. Every testing concession checks
-- this one function, so adding a concession is one IF in the function it
-- relaxes. Current concessions: collusion caps off (check_team_collusion,
-- check_pair_collusion).
CREATE OR REPLACE FUNCTION is_test_mode()
    RETURNS BOOLEAN AS $$
    SELECT COALESCE((SELECT test_mode FROM game_state WHERE id = 1), false);
$$ LANGUAGE sql STABLE;
