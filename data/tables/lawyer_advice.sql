CREATE TABLE lawyer_advice (
    lawyer_id UUID REFERENCES player(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES player(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (lawyer_id, recipient_id),
    constraint lawyer_advice_recipient_id_fkey foreign KEY (recipient_id) references player (id)
        on update cascade on delete cascade,
    constraint lawyer_advice_lawyer_id_fkey foreign KEY (lawyer_id) references player (id)
        on update cascade on delete cascade
);

ALTER TABLE lawyer_advice REPLICA IDENTITY FULL;
ALTER TABLE lawyer_advice ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE lawyer_advice;

CREATE POLICY "Allow authenticated read access"
    ON lawyer_advice FOR SELECT
    TO authenticated
    USING (true);
