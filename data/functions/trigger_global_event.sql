CREATE OR REPLACE FUNCTION trigger_global_event(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_target_id TEXT,
    p_success_event_id UUID,
    p_failure_event_id UUID DEFAULT NULL
)
    RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.global_event (
        title,
        message,
        event_type,
        target_scan_id,
        expires_at,
        success_event_id,
        failure_event_id
    )
    VALUES (
        p_title,
        p_message,
        p_type,
        p_target_id,
        NOW() + INTERVAL '5 minutes',
        p_success_event_id,
        p_failure_event_id
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
