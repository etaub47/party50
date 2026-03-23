CREATE OR REPLACE FUNCTION public.trigger_specific_cooldown(p_event_id UUID)
    RETURNS void AS $$
BEGIN
    INSERT INTO public.player_event (player_id, event_id)
    SELECT p.id, p_event_id
    FROM public.player p
    -- Only insert if the player hasn't received THIS specific event ID yet
    WHERE NOT EXISTS (
        SELECT 1 FROM public.player_event pe
        WHERE pe.player_id = p.id AND pe.event_id = p_event_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

create extension if not exists pg_cron;
SELECT cron.schedule('cooldown-1', '0 */3 * * *',
    'SELECT trigger_specific_cooldown(''c001da01-0000-4000-8000-000000000001'')');
SELECT cron.schedule('cooldown-2', '30 */3 * * *',
    'SELECT trigger_specific_cooldown(''c001da01-0000-4000-8000-000000000002'')');
SELECT cron.schedule('cooldown-3', '0 1-22/3 * * *',
    'SELECT trigger_specific_cooldown(''c001da01-0000-4000-8000-000000000003'')');
SELECT cron.schedule('cooldown-4', '30 1-22/3 * * *',
    'SELECT trigger_specific_cooldown(''c001da01-0000-4000-8000-000000000004'')');
SELECT cron.schedule('cooldown-5', '0 2-23/3 * * *',
    'SELECT trigger_specific_cooldown(''c001da01-0000-4000-8000-000000000005'')');
SELECT cron.schedule('cooldown-6', '30 2-23/3 * * *',
    'SELECT trigger_specific_cooldown(''c001da01-0000-4000-8000-000000000006'')');
