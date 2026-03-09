create table public.player_event (
    player_id  uuid                     not null default gen_random_uuid(),
    event_id   uuid                     not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    constraint player_event_pkey primary key (player_id, event_id),
    constraint player_event_event_id_fkey foreign KEY (event_id) references event (id) on update CASCADE on delete CASCADE,
    constraint player_event_player_id_fkey foreign KEY (player_id) references player (id) on update CASCADE on delete CASCADE
);

ALTER TABLE player_event REPLICA IDENTITY FULL;
ALTER TABLE player_event ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime add table player_event;

CREATE POLICY player_event_view_all
    ON player_event
    AS PERMISSIVE FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY player_event_manage_own
    ON player_event
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (player_id = auth.uid());
