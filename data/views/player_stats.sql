CREATE OR REPLACE VIEW player_stats
WITH (security_invoker = true)
AS SELECT
    id,
    name,
    role,
    current_credits,
    LEAST(max_intel, raw_intel) AS total_intel,
    total_heat,
    max_intel,
    max_credits,
    is_locked_out
FROM (
    SELECT
        p.id,
        p.name,
        p.role,

        (COALESCE((SELECT SUM(i.credits) FROM player_item pi JOIN item i ON pi.item_id = i.id WHERE pi.player_id = p.id), 0) +
        COALESCE((SELECT SUM(e.credits) FROM player_event pe JOIN event e ON pe.event_id = e.id WHERE pe.player_id = p.id), 0) -
        COALESCE((SELECT SUM(CASE WHEN p.role = 'Bargain Hunter' THEN FLOOR(i.cost * 0.7) ELSE i.cost END)
                    FROM player_item pi JOIN item i ON pi.item_id = i.id
                    WHERE pi.player_id = p.id AND i.cost > 0
                 ), 0) + 25)::integer AS current_credits,

        ( COALESCE((SELECT SUM(i.intel) FROM player_item pi JOIN item i ON pi.item_id = i.id WHERE pi.player_id = p.id), 0) +
          COALESCE((SELECT SUM(e.intel) FROM player_event pe JOIN event e ON pe.event_id = e.id WHERE pe.player_id = p.id), 0)
        ) AS raw_intel,

        GREATEST(0, (
            COALESCE((SELECT SUM(i.heat) FROM player_item pi JOIN item i ON pi.item_id = i.id WHERE pi.player_id = p.id), 0) +
            COALESCE((SELECT SUM(e.heat) FROM player_event pe JOIN event e ON pe.event_id = e.id WHERE pe.player_id = p.id), 0)
        )) AS total_heat,

        ( 200 +
            CASE WHEN EXISTS (
                SELECT 1 FROM player_item pi JOIN item i ON pi.item_id = i.id
                WHERE pi.player_id = p.id AND i.name = '8TB Thumb Drive'
            ) THEN 200 ELSE 0 END
        ) AS max_intel,

        250 AS max_credits,

        ( CASE WHEN (
            COALESCE((SELECT SUM(i.heat) FROM player_item pi JOIN item i ON pi.item_id = i.id WHERE pi.player_id = p.id), 0) +
            COALESCE((SELECT SUM(e.heat) FROM player_event pe JOIN event e ON pe.event_id = e.id WHERE pe.player_id = p.id), 0)
          ) >= 100 THEN true ELSE false END
        ) AS is_locked_out

    FROM player p
) sub;
