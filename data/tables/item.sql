create table public.item (
    id      uuid    not null default gen_random_uuid(),
    name    text    null,
    type    text    null,
    cost    integer not null default 0,
    intel   integer not null default 0,
    heat    integer not null default 0,
    credits integer not null default 0
    constraint item_pkey primary key (id)
);

-- tools
INSERT INTO "public"."item" ("id", "name", "type", "cost", "intel", "heat") VALUES

    -- Core Upgrades (The Progression Gates)

    -- Increases Max Intel cap from 250 to 500.
    ('e4d2bd62-daee-4686-bf4b-5108c4d8512f', '8TB Thumb Drive', 'Tool', '50', '0', '0'),
    -- Increases Max Credit cap from 100 to 500.
    ('78abe62a-9ab4-4b52-819e-f7b022843425', 'Offshore Bank Account', 'Tool', '20', '0', '0'),

    -- Information Warfare (The Utility Tools)

    -- Unlocks detailed player stats & performance metrics on the Leaderboard.
    ('707d9af2-6725-4e8c-8fa5-9b42162cec01', 'Agent Dossier', 'Tool', '40', '0', '0'),
    -- Displays uncompleted missions and remaining undiscovered Hidden Items.
    ('e16ac235-511b-42e6-9ae3-8481f963a221', 'Recon Readout', 'Tool', '50', '0', '0'),

    -- Emergency Relief (The Consumables)

    -- One-time use item. Instantly vents -30 Heat from your ledger.
    ('49dd92f1-398e-4553-9f71-179c85ed9e21', 'Infrared Mitigation Device', 'Tool', '80', '0', '-30'),

    -- Mission Prerequisites (The Gatekeepers)

    ('1e074410-fef1-41af-858a-93baceec2559', 'Tranquilizer Dart Gun', 'Tool', '40', '0', '0'),
    ('3a647af2-f677-4d8f-840e-656c6f88eba6', 'Biometric Voice Modulator', 'Tool', '50', '0', '0'),
    ('88372c8f-bb5e-4cb6-8580-58b628b0e527', 'Laser Cutting Tool', 'Tool', '30', '0', '0'),
    ('cd865e9d-da78-4fb4-855c-65e02e3899e3', 'Micro Recon Drone', 'Tool', '60', '0', '0'),
    ('d83c10ed-c2c8-47af-987c-fe8115f0cdf8', 'RFID Keycard Replicator', 'Tool', '40', '0', '0');

-- mission rewards
INSERT INTO public.item(id, name, type, cost, intel, heat, credits) VALUES

    -- project_archimedes
    ('9776d9bc-4d2e-45f8-9cc1-77cd3db9858a', 'Core Bio-Code', 'Intel', 0, 15, 17, 0),
    ('c33fa305-584e-4dbf-83f8-2d09a64ab473', 'HVAC Overclock Logs', 'Intel', 0, 8, 3, 10),

    -- executive_wash
    ('7b5dcfd6-4de2-482d-bfc1-2d74c76e71e1', 'C-Suite Wiretap', 'Intel', 0, 16, 18, 0),
    ('fe554075-7dfb-4bd4-ae9b-a0c7bcfbaba4', 'C-Suite Expense Card', 'Intel', 0, 0, 0, 40),

    -- ghost_protocol
    ('30887acc-82e5-4626-aa28-f9c1e217ebd5', 'Quantum SSD', 'Intel', 0, 20, 23, 0),
    ('dbcf503a-d659-4bac-ace2-2864cc414a95', 'Crypto Bounty Invoice', 'Intel', 0, 5, 2, 35),

    -- sub_level_four
    ('7562349f-a9d0-426b-aa27-178a60a6eb9b', 'Enzyme Blueprint', 'Intel', 0, 15, 17, 0),
    ('b51d17ff-637b-431f-b3e2-63553821b22e', 'Subsidiary Options', 'Intel', 0, 8, 4, 20),

    -- shadow_grid
    ('b8827af1-3fc6-4642-892f-e7abf7c0da7f', 'Grid Vulnerability Map', 'Intel', 0, 18, 20, 0),
    ('1e6b0df1-0ac3-4a53-ac6f-483471317242', 'Substation Badge Pack', 'Intel', 0, 10, 5, 15),

    -- boardroom_audit
    ('694e6036-e203-4e82-8746-93d2bbf42962', 'Black-Budget Ledger', 'Intel', 0, 18, 21, 0),
    ('db32c38e-e196-4e0c-87f2-25eed62eec8c', 'Advisory Retainer Ledger', 'Intel', 0, 6, 1, 35),

    -- terminal_b_drop
    ('49765c54-c3e3-4854-8bfe-d9db7948ed4d', 'Firmware Dump', 'Intel', 0, 10, 11, 0),
    ('a617a567-a790-47c8-997e-5bde05a49737', 'Bribe Cash Envelope', 'Intel', 0, 0, 0, 25),

    -- compliance_gamble
    ('4f1e2f5b-72a2-48d6-93be-8b4ca172cc38', 'Shredded SEC Memo', 'Intel', 0, 14, 16, 0),
    ('b0a4790e-00df-4b87-bee6-16b57702e6c5', 'Consultant Slush Fund', 'Intel', 0, 4, 0, 30),

    -- deep_freeze_hub
    ('40abf650-edfe-41b5-8c4f-2113ab988e53', 'Cooling Blueprint', 'Intel', 0, 15, 18, 0),
    ('1261ecbb-d079-43df-8c1e-aa0f4bf84810', 'Datacenter Sublease', 'Intel', 0, 0, 0, 35),

    -- executive_flight
    ('5d4c5bd1-e7f2-4b2d-b053-79ca8a9ab615', 'Avionics Audio Log', 'Intel', 0, 16, 19, 0),
    ('ad1407a0-ddc1-43a6-9672-0c5fa8620a9c', 'Fuel Vendor Credit', 'Intel', 0, 7, 3, 25),

    -- pharma_splicing
    ('09481116-520f-4700-a1f7-9361bb1b5755', 'Synthetic Compound Form', 'Intel', 0, 18, 21, 0),
    ('94af9b5e-214e-4203-ae69-e46efe438808', 'Trial Fast-Track Voucher', 'Intel', 0, 8, 4, 20),

    -- dark_site_uplink
    ('3130bafe-27ac-47cd-8bdb-0003d6cac56c', 'Satellite Access Patch', 'Intel', 0, 17, 19, 0),
    ('9054d5de-b0d8-44c7-b765-1553af9ffc85', 'Telecom Holding Shares', 'Intel', 0, 0, 0, 45),

    -- personnel_purge
    ('c58ed147-7f75-4013-b552-7a9a7de2a77a', 'VP Personal Dossier', 'Intel', 0, 14, 16, 0),
    ('6391dfd9-c2ae-4536-a10b-48581dbb1438', 'Severance Loophole Cash', 'Intel', 0, 5, 1, 25),

    -- park_bench_drop
    ('d3781bca-9095-4546-a90b-e352c702e7c0', 'Calendar Schedule Sync', 'Intel', 0, 8, 9, 0),
    ('4eaf661c-0410-4102-90c1-ec2da8bc8d50', 'Laundering Courier Cash', 'Intel', 0, 0, 0, 20),

    -- project_aegis
    ('2e5adc3e-6535-4cd2-a166-3af99d880c91', 'AI Weight Matrix', 'Intel', 0, 20, 24, 0),
    ('b570fa88-6783-415b-a9bc-932a97a5029b', 'Patent Liquidation Pay', 'Intel', 0, 10, 5, 25),

    -- shell_entity
    ('6adafb78-e823-4625-8354-af46425154c4', 'Shell Entity Network Map', 'Intel', 0, 12, 14, 0),
    ('e875c877-f4ec-462c-ad14-be0af2c7088f', 'Wire Transfer Payout', 'Intel', 0, 0, 0, 40),

    -- warehouse_sweep
    ('3150171c-fb1f-4189-be6a-4892325855eb', 'Logistics Route Manifest', 'Intel', 0, 14, 16, 0),
    ('7e213ce3-bd96-44f6-ab79-a5652640f575', 'Freight Kickback Invoice', 'Intel', 0, 6, 2, 25),

    -- proxy_hijack
    ('44c21114-eba9-4c25-be4d-d94cee2820d1', 'Firewall Rule Map', 'Intel', 0, 16, 18, 0),
    ('d0311188-2108-446b-9862-070b9202cac8', 'ISP Contract Credit', 'Intel', 0, 8, 4, 15),

    -- lobby_infiltration
    ('ed4490df-fde0-45b4-9f72-a911a838596a', 'Keycard Master Access Map', 'Intel', 0, 12, 14, 0),
    ('ed0a83d6-9fcd-4485-b884-e6aa9dda729e', 'Security Rota Schedule', 'Intel', 0, 5, 2, 20),

    -- patent_office_probe
    ('095052ae-6e06-4fbb-bd84-3eed371772dd', 'Pending Competitor Patent', 'Intel', 0, 15, 17, 0),
    ('46546b7c-4cfc-446f-9d48-b90f673c3017', 'Legal Settlement Credit', 'Intel', 0, 7, 3, 20),

    -- server_room_sprint
    ('0a2798c8-1d06-411b-948b-78df7ae47d90', 'Route Topology Matrix', 'Intel', 0, 18, 21, 0),
    ('22baf1ae-8e8a-4bf0-aa74-94ec9598f756', 'SaaS Subscription Codes', 'Intel', 0, 9, 4, 20),

    -- laundromat_drop
    ('7e849a92-be88-4ddb-9175-43bd4776d1be', 'Vendor Contact Ledger', 'Intel', 0, 9, 10, 0),
    ('a39556f4-344c-48ac-9e25-2e8362599fc3', 'Unmarked Currency Brick', 'Intel', 0, 0, 0, 20),

    -- project_hyperion
    ('4f6834c8-8ebd-420f-8c65-a5e4280e7e69', 'Hyperion Framework Blueprint', 'Intel', 0, 19, 22, 0),
    ('0e0ce49e-4c81-4cf6-9c70-2d77ddbd534c', 'Hyperion R&D Vendor Grant', 'Intel', 0, 10, 5, 15),

    -- tax_loophole_breach
    ('4e2f23e6-832e-4cee-8c93-9f6d6d442222', 'Offshore Tax Shield Map', 'Intel', 0, 13, 15, 0),
    ('6f01f62d-1ef3-454c-a803-7975708bb80c', 'Cayman Account Credit', 'Intel', 0, 0, 0, 50),

    -- cleaning_crew_shift
    ('59b853de-fc5e-4586-90e8-485c9e7c7567', 'Executive Wing Key Log', 'Intel', 0, 12, 14, 0),
    ('9cf97e42-720c-4054-bed0-720d66ca17b9', 'Facility Cleaning Retainer', 'Intel', 0, 6, 2, 25);

-- hidden items
INSERT INTO public.item(name, type, cost, intel, heat, credits) VALUES
    ('Discarded Sticky Note', 'Miscellaneous', 0, 0, 0, 5),
    ('Shredded Memo Fragment', 'Miscellaneous', 0, 5, 2, 0),
    ('Unmarked Key Fob', 'Miscellaneous', 0, 0, 0, 10),
    ('Unlocked Maintenance Tablet', 'Miscellaneous', 0, 8, 4, 0),
    ('Corrupted SD Card', 'Miscellaneous', 0, 0, 1, 5),
    ('C-Suite Badge Lanyard', 'Miscellaneous', 0, 0, 0, 15),
    ('Visitor Pass Log', 'Miscellaneous', 0, 6, 3, 0),
    ('Discarded Boardroom Agenda', 'Miscellaneous', 0, 4, 1, 0),
    ('Misplaced Encrypted Fob', 'Miscellaneous', 0, 0, 0, 12),
    ('HR Onboarding Packet', 'Miscellaneous', 0, 3, 0, 0);
