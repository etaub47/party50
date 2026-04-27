
CREATE TABLE public.global_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'BOON' or 'BANE'
    target_scan_id TEXT NOT NULL, -- the id of the QR code they must find
    success_event_id UUID NOT NULL, -- the event if the player succeeds,
    failure_event_id UUID NOT NULL, -- the event if the player fails,
    constraint global_event_success_event_id_fkey foreign KEY (success_event_id) references event (id),
    constraint global_event_failure_event_id_fkey foreign KEY (failure_event_id) references event (id)
);

CREATE TABLE public.global_event_participation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_event_id UUID REFERENCES public.global_event(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.player(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(global_event_id, player_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE global_event;

ALTER TABLE public.global_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_event_participation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view global events"
    ON public.global_event FOR SELECT
    TO authenticated
    USING (true);

-- agents can only see their OWN participation
CREATE POLICY "Agents can view own participation"
    ON public.global_event_participation FOR SELECT
    TO authenticated
    USING (auth.uid() = player_id);

-- agents can INSERT their own participation (when they scan the QR)
CREATE POLICY "Agents can check-in to global events"
    ON public.global_event_participation FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = player_id);
