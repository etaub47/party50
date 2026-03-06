create table public.player (
    id      uuid    not null default gen_random_uuid(),
    name    text    null     default 'Player'::text,
    credits integer not null default 20,
    role    text    null,
    constraint player_pkey primary key (id),
    constraint player_id_fkey foreign KEY (id) references auth.users (id)
        on update CASCADE on delete CASCADE
);

ALTER TABLE player REPLICA IDENTITY FULL;
ALTER TABLE player ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime add table player;

CREATE POLICY player_allow_anonymous_insert
    ON player
    AS PERMISSIVE FOR INSERT
    TO anon, authenticated
    USING (true);

CREATE POLICY player_view_all
    ON player
    AS PERMISSIVE FOR SELECT
    TO anon, authenticated
    USING (true);
