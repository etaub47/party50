-- Shared guard for every RPC that should only run while the game is live.
-- Centralized so the gate is one function to update, not one check per RPC.
CREATE OR REPLACE FUNCTION assert_game_in_progress()
    RETURNS VOID AS $$
BEGIN
    IF current_game_status() != 'IN_GAME' THEN
        RAISE EXCEPTION 'The game is not currently active.';
    END IF;
END;
$$ LANGUAGE plpgsql;
