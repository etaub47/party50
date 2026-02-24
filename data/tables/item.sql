create table public.item
(
    id    uuid not null default gen_random_uuid(),
    name  text null,
    type  text null,
    cost  integer null default 0,
    intel integer null default 0,
    heat  integer null default 0,
    constraint item_pkey primary key (id)
) TABLESPACE pg_default;

INSERT INTO "public"."item" ("id", "name", "type", "cost", "intel", "heat") VALUES
    ('1e074410-fef1-41af-858a-93baceec2559', 'Tranquilizer Dart Gun', 'Key', '40', '0', '0'),
    ('3a647af2-f677-4d8f-840e-656c6f88eba6', 'Biometric Voice Modulator', 'Key', '50', '0', '0'),
    ('49dd92f1-398e-4553-9f71-179c85ed9e21', 'Infrared Mitigation Device', 'Tool', '80', '0', '0'),
    ('707d9af2-6725-4e8c-8fa5-9b42162cec01', 'Agent Dossier', 'Tool', '40', '0', '0'),
    ('78abe62a-9ab4-4b52-819e-f7b022843425', 'Offshore Bank Account', 'Tool', '20', '0', '0'),
    ('88372c8f-bb5e-4cb6-8580-58b628b0e527', 'Laser Cutting Tool', 'Key', '30', '0', '0'),
    ('cd865e9d-da78-4fb4-855c-65e02e3899e3', 'Micro Recon Drone', 'Key', '60', '0', '0'),
    ('d83c10ed-c2c8-47af-987c-fe8115f0cdf8', 'RFID Keycard Replicator', 'Key', '40', '0', '0'),
    ('e16ac235-511b-42e6-9ae3-8481f963a221', 'Recon Readout', 'Tool', '50', '0', '0'),
    ('e4d2bd62-daee-4686-bf4b-5108c4d8512f', '8TB Thumb Drive', 'Tool', '50', '0', '0');
