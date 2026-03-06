create table public.player_item (
    player_id  uuid                     not null default gen_random_uuid(),
    item_id    uuid                     not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    constraint player_item_pkey primary key (player_id, item_id),
    constraint player_item_item_id_fkey foreign KEY (item_id) references item (id) on update CASCADE on delete CASCADE,
    constraint player_item_player_id_fkey foreign KEY (player_id) references player (id) on update CASCADE on delete CASCADE
);

ALTER TABLE player_item REPLICA IDENTITY FULL;
ALTER TABLE player_item ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime add table player_item;

CREATE POLICY player_item_view_all
    ON player_item
    AS PERMISSIVE FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY player_item_manage_own
    ON player_item
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (player_id = auth.uid());
