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
    ('49dd92f1-398e-4553-9f71-179c85ed9e21', 'Infrared Mitigation Device', 'Tool', '80', '0', '0'),

    -- Mission Prerequisites (The Gatekeepers)

    ('1e074410-fef1-41af-858a-93baceec2559', 'Tranquilizer Dart Gun', 'Tool', '40', '0', '0'),
    ('3a647af2-f677-4d8f-840e-656c6f88eba6', 'Biometric Voice Modulator', 'Tool', '50', '0', '0'),
    ('88372c8f-bb5e-4cb6-8580-58b628b0e527', 'Laser Cutting Tool', 'Tool', '30', '0', '0'),
    ('cd865e9d-da78-4fb4-855c-65e02e3899e3', 'Micro Recon Drone', 'Tool', '60', '0', '0'),
    ('d83c10ed-c2c8-47af-987c-fe8115f0cdf8', 'RFID Keycard Replicator', 'Tool', '40', '0', '0');

-- mission rewards
INSERT INTO public.item(name, type, cost, intel, heat, credits) VALUES

    -- project_archimedes
    ('Core Bio-Code', 'Intel', 0, 15, 17, 0),
    ('HVAC Overclock Logs', 'Intel', 0, 8, 3, 10),

    -- executive_wash
    ('C-Suite Wiretap', 'Intel', 0, 16, 18, 0),
    ('C-Suite Expense Card', 'Intel', 0, 0, 0, 40),

    -- ghost_protocol
    ('Quantum SSD', 'Intel', 0, 20, 23, 0),
    ('Crypto Bounty Invoice', 'Intel', 0, 5, 2, 35),

    -- sub_level_four
    ('Enzyme Blueprint', 'Intel', 0, 15, 17, 0),
    ('Subsidiary Options', 'Intel', 0, 8, 4, 20),

    -- shadow_grid
    ('Grid Vulnerability Map', 'Intel', 0, 18, 20, 0),
    ('Substation Badge Pack', 'Intel', 0, 10, 5, 15),

    -- boardroom_audit
    ('Black-Budget Ledger', 'Intel', 0, 18, 21, 0),
    ('Advisory Retainer Ledger', 'Intel', 0, 6, 1, 35),

    -- terminal_b_drop
    ('Firmware Dump', 'Intel', 0, 10, 11, 0),
    ('Bribe Cash Envelope', 'Intel', 0, 0, 0, 25),

    -- compliance_gamble
    ('Shredded SEC Memo', 'Intel', 0, 14, 16, 0),
    ('Consultant Slush Fund', 'Intel', 0, 4, 0, 30),

    -- deep_freeze_hub
    ('Cooling Blueprint', 'Intel', 0, 15, 18, 0),
    ('Datacenter Sublease', 'Intel', 0, 0, 0, 35),

    -- executive_flight
    ('Avionics Audio Log', 'Intel', 0, 16, 19, 0),
    ('Fuel Vendor Credit', 'Intel', 0, 7, 3, 25),

    -- pharma_splicing
    ('Synthetic Compound Form', 'Intel', 0, 18, 21, 0),
    ('Trial Fast-Track Voucher', 'Intel', 0, 8, 4, 20),

    -- dark_site_uplink
    ('Satellite Access Patch', 'Intel', 0, 17, 19, 0),
    ('Telecom Holding Shares', 'Intel', 0, 0, 0, 45),

    -- personnel_purge
    ('VP Personal Dossier', 'Intel', 0, 14, 16, 0),
    ('Severance Loophole Cash', 'Intel', 0, 5, 1, 25),

    -- park_bench_drop
    ('Calendar Schedule Sync', 'Intel', 0, 8, 9, 0),
    ('Laundering Courier Cash', 'Intel', 0, 0, 0, 20),

    -- project_aegis
    ('AI Weight Matrix', 'Intel', 0, 20, 24, 0),
    ('Patent Liquidation Pay', 'Intel', 0, 10, 5, 25),

    -- shell_entity
    ('Shell Entity Network Map', 'Intel', 0, 12, 14, 0),
    ('Wire Transfer Payout', 'Intel', 0, 0, 0, 40),

    -- warehouse_sweep
    ('Logistics Route Manifest', 'Intel', 0, 14, 16, 0),
    ('Freight Kickback Invoice', 'Intel', 0, 6, 2, 25),

    -- proxy_hijack
    ('Firewall Rule Map', 'Intel', 0, 16, 18, 0),
    ('ISP Contract Credit', 'Intel', 0, 8, 4, 15),

    -- lobby_infiltration
    ('Keycard Master Access Map', 'Intel', 0, 12, 14, 0),
    ('Security Rota Schedule', 'Intel', 0, 5, 2, 20),

    -- patent_office_probe
    ('Pending Competitor Patent', 'Intel', 0, 15, 17, 0),
    ('Legal Settlement Credit', 'Intel', 0, 7, 3, 20),

    -- server_room_sprint
    ('Route Topology Matrix', 'Intel', 0, 18, 21, 0),
    ('SaaS Subscription Codes', 'Intel', 0, 9, 4, 20),

    -- laundromat_drop
    ('Vendor Contact Ledger', 'Intel', 0, 9, 10, 0),
    ('Unmarked Currency Brick', 'Intel', 0, 0, 0, 20),

    -- project_hyperion
    ('Hyperion Framework Blueprint', 'Intel', 0, 19, 22, 0),
    ('Hyperion R&D Vendor Grant', 'Intel', 0, 10, 5, 15),

    -- tax_loophole_breach
    ('Offshore Tax Shield Map', 'Intel', 0, 13, 15, 0),
    ('Cayman Account Credit', 'Intel', 0, 0, 0, 50),

    -- cleaning_crew_shift
    ('Executive Wing Key Log', 'Intel', 0, 12, 14, 0),
    ('Facility Cleaning Retainer', 'Intel', 0, 6, 2, 25);


--INSERT INTO public.item(name, type, cost, intel, heat, credits) VALUES
--    ('Manilla Envelope', 'Intel', 0, 15, 10, 0),
--    ('Floppy Disk', 'Intel', 0, 10, 5, 0);

-- hidden items
INSERT INTO public.item(name, type, intel, heat, credits) VALUES
    ('Loose Cash', 'Miscellaneous', 0, 0, 10),
    ('Large Credit Stick', 'Miscellaneous', 0, 0, 50),
    ('Discarded Ledger', 'Intel', 5, 2, 0);
