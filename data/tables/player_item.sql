create table public.player_item
(
    player_id  uuid                     not null default gen_random_uuid(),
    item_id    uuid                     not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    constraint player_item_pkey primary key (player_id, item_id),
    constraint player_item_item_id_fkey foreign KEY (item_id) references item (id) on update CASCADE on delete CASCADE,
    constraint player_item_player_id_fkey foreign KEY (player_id) references player (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
