CREATE TABLE lawyer_advice (
    lawyer_id UUID REFERENCES player(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES player(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (lawyer_id, recipient_id)
);

ALTER TABLE lawyer_advice REPLICA IDENTITY FULL;
ALTER TABLE lawyer_advice ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE lawyer_advice;

CREATE POLICY "Allow authenticated read access"
    ON lawyer_advice FOR SELECT
    TO authenticated
    USING (true);
