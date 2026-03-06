CREATE OR REPLACE VIEW player_stats
WITH (security_invoker = true)
AS SELECT
    p.id,
    p.name,
    p.role,
    p.credits AS current_credits,

    ( COALESCE((SELECT SUM(i.intel) FROM player_item pi JOIN item i ON pi.item_id = i.id WHERE pi.player_id = p.id), 0) +
      COALESCE((SELECT SUM(e.intel) FROM player_event pe JOIN event e ON pe.event_id = e.id WHERE pe.player_id = p.id), 0)
    ) AS total_intel,

    GREATEST(0, (
        COALESCE((SELECT SUM(i.heat) FROM player_item pi JOIN item i ON pi.item_id = i.id WHERE pi.player_id = p.id), 0) +
        COALESCE((SELECT SUM(e.heat) FROM player_event pe JOIN event e ON pe.event_id = e.id WHERE pe.player_id = p.id), 0)
    )) AS total_heat,

    ( 250 +
        CASE WHEN EXISTS (
            SELECT 1 FROM player_item pi JOIN item i ON pi.item_id = i.id
            WHERE pi.player_id = p.id AND i.name = '8TB Thumb Drive'
        ) THEN 250 ELSE 0 END
    ) AS max_intel,

    ( 100 +
        CASE WHEN EXISTS (
            SELECT 1 FROM player_item pi JOIN item i ON pi.item_id = i.id
            WHERE pi.player_id = p.id AND i.name = 'Offshore Account'
        ) THEN 400 ELSE 0 END
    ) AS max_credits,

    ( CASE WHEN (
        COALESCE((SELECT SUM(i.heat) FROM player_item pi JOIN item i ON pi.item_id = i.id WHERE pi.player_id = p.id), 0) +
        COALESCE((SELECT SUM(e.heat) FROM player_event pe JOIN event e ON pe.event_id = e.id WHERE pe.player_id = p.id), 0)
      ) >= 100 THEN true ELSE false END
    ) AS is_locked_out

FROM player p;
