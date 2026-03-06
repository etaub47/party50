CREATE OR REPLACE FUNCTION get_my_team_ids()
    RETURNS SETOF uuid
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
AS $$
SELECT team_id
FROM player_challenge
WHERE player_id = auth.uid();
$$;
