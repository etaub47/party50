CREATE OR REPLACE FUNCTION get_agent_pulse()
    RETURNS TABLE (
        player_id UUID,
        last_active_at TIMESTAMPTZ
    ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            p.id as player_id,
            GREATEST(
                -- fallback: the moment the account was created
                p.created_at,

            -- latest from player_event (excluding cooldowns)
                COALESCE((
                    SELECT MAX(pe.created_at)
                    FROM player_event pe
                        JOIN event e ON pe.event_id = e.id
                    WHERE pe.player_id = p.id
                        AND e.description NOT ILIKE '%cooldown%'
                             ), p.created_at),

            -- latest from player_item
                COALESCE((
                    SELECT MAX(pi.created_at)
                    FROM player_item pi
                    WHERE pi.player_id = p.id
                ), p.created_at)
            ) as last_active_at
        FROM player p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
