/**
 * Regression tests for the Supabase realtime channel lifecycle used by
 * MissionRunner, usePlayerDataSync and GlobalAlertListener.
 *
 * Run with:  npm run test:realtime
 *
 * These exercise the REAL @supabase/realtime-js client, but swap its socket for
 * an in-process fake via the documented `transport` option. No network, no TCP
 * port, no Supabase project, and no dependencies beyond what the app already
 * installs — so this file is inert for both `next dev` and `next build`.
 *
 * Three lifecycle rules are under test:
 *   1. Tearing down must not resurrect a channel. `removeChannel()` makes the
 *      library emit CLOSED to the subscribe callback, and CLOSED is a retry
 *      trigger, so cleanup has to disarm the retry before removing.
 *   2. A retry must replace its channel, never stack a second one alongside it.
 *   3. A superseded channel's own CLOSED must not schedule further retries,
 *      or one outage churns forever at the retry interval.
 *
 * `legacy` reproduces the pre-fix logic and is expected to violate 1 and 2; it
 * is kept so the tests fail loudly if someone reintroduces that shape.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeClient } from '@supabase/realtime-js';

const RETRY_MS = 60;        // stand-in for the app's 5s retry
const JOIN_TIMEOUT_MS = 150;

// ------------------------------------------------------- in-process transport

/** Every fake socket currently believed to be open, so a test can drop them. */
const liveSockets = new Set();

/**
 * Minimal WebSocket stand-in speaking Supabase realtime's vsn=2.0.0 framing:
 * [join_ref, ref, topic, event, payload]. Replying to phx_join without a
 * `postgres_changes` field makes the client report SUBSCRIBED immediately.
 */
class FakeSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        liveSockets.add(this);
        setImmediate(() => {
            if (this.readyState !== 0) return;
            this.readyState = 1; // OPEN
            this.onopen?.({});
        });
    }

    send(raw) {
        if (this.readyState !== 1) return;
        let frame;
        try { frame = JSON.parse(raw); } catch { return; }
        if (!Array.isArray(frame)) return;
        const [join_ref, ref, topic] = frame;
        if (ref === undefined || ref === null) return;
        setImmediate(() => {
            if (this.readyState !== 1) return;
            this.onmessage?.({
                data: JSON.stringify([
                    join_ref, ref, topic, 'phx_reply',
                    { status: 'ok', response: {} },
                ]),
            });
        });
    }

    close(code, reason) {
        if (this.readyState === 3) return;
        this.readyState = 3; // CLOSED
        liveSockets.delete(this);
        setImmediate(() => this.onclose?.({ code: code ?? 1000, reason }));
    }

    /** Test hook: abrupt connection loss, no clean close frame. */
    drop() {
        if (this.readyState === 3) return;
        this.readyState = 3;
        liveSockets.delete(this);
        this.onclose?.({ code: 1006, reason: 'dropped' });
    }
}

function dropConnection() {
    for (const sock of [...liveSockets]) sock.drop();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function newClient() {
    return new RealtimeClient('ws://realtime.test/socket', {
        transport: FakeSocket,
        params: { apikey: 'fake-anon-key' },
        heartbeatIntervalMs: 60_000,
        timeout: JOIN_TIMEOUT_MS,
        reconnectAfterMs: () => 40,
    });
}

// ------------------------------------------------------- the two lifecycles

let seq = 0;

/** Pre-fix shape: retries on CLOSED, and cleanup cannot stop them. */
function mountLegacy(client, onStatus = () => {}) {
    const channelName = `legacy-${++seq}`;
    let channel;

    const setupRealtime = () => {
        channel = client.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'player_vote' }, () => {})
            .subscribe(status => {
                onStatus(status);
                if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status))
                    setTimeout(() => { void setupRealtime(); }, RETRY_MS);
            });
    };

    setupRealtime();
    return () => { if (channel) void client.removeChannel(channel); };
}

/** Current shape, mirroring the three source files. */
function mountFixed(client, onStatus = () => {}, withGenGuard = true) {
    const id = `fixed-${++seq}`;
    let isActive = true;
    let channel = null;
    let retryTimer = null;
    let generation = 0;

    const scheduleRetry = () => {
        if (!isActive || retryTimer) return;
        retryTimer = setTimeout(() => {
            retryTimer = null;
            void setupRealtime();
        }, RETRY_MS);
    };

    const setupRealtime = async () => {
        if (!isActive) return;
        const myGen = ++generation;

        if (channel) {
            const stale = channel;
            channel = null;
            await client.removeChannel(stale);
            if (!isActive || (withGenGuard && myGen !== generation)) return;
        }

        const channelName = `${id}-${++seq}`;
        channel = client.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'player_vote' }, () => {})
            .subscribe(status => {
                if (!isActive) return;
                if (withGenGuard && myGen !== generation) return;
                onStatus(status);
                if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status))
                    scheduleRetry();
            });
    };

    void setupRealtime();
    return () => {
        isActive = false;
        if (retryTimer) clearTimeout(retryTimer);
        if (channel) void client.removeChannel(channel);
    };
}

// ------------------------------------------------------------------- the tests

test('removeChannel() emits CLOSED to the subscribe callback', async () => {
    const client = newClient();
    const seen = [];
    const ch = client.channel('premise')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'x' }, () => {})
        .subscribe(s => seen.push(s));

    await sleep(100);
    assert.ok(seen.includes('SUBSCRIBED'), `expected SUBSCRIBED, got [${seen}]`);

    await client.removeChannel(ch);
    await sleep(60);
    assert.ok(seen.includes('CLOSED'),
        `removeChannel must emit CLOSED (this is why cleanup has to disarm the retry first); got [${seen}]`);
    client.disconnect();
});

test('unmount leaves no channel behind', async () => {
    const client = newClient();
    const unmount = mountFixed(client);
    await sleep(100);
    assert.equal(client.getChannels().length, 1);

    unmount();
    await sleep(RETRY_MS * 5);
    assert.equal(client.getChannels().length, 0, 'unmount must not resurrect a channel');
    client.disconnect();
});

test('pre-fix shape resurrects a channel after unmount', async () => {
    const client = newClient();
    const unmount = mountLegacy(client);
    await sleep(100);

    unmount();
    await sleep(RETRY_MS * 5);
    assert.ok(client.getChannels().length > 0,
        'guard rail: the pre-fix shape is expected to leak here');
    client.disconnect();
});

test('repeated mount/unmount cycles accumulate nothing', async () => {
    // stands in for the effect re-running on every mission step change
    const client = newClient();
    for (let i = 0; i < 10; i++) {
        const unmount = mountFixed(client);
        await sleep(40);
        unmount();
    }
    await sleep(RETRY_MS * 6);
    assert.equal(client.getChannels().length, 0, 'ten cycles must leave zero channels');
    client.disconnect();
});

test('pre-fix shape accumulates one zombie per cycle', async () => {
    const client = newClient();
    for (let i = 0; i < 10; i++) {
        const unmount = mountLegacy(client);
        await sleep(40);
        unmount();
    }
    await sleep(RETRY_MS * 6);
    assert.ok(client.getChannels().length > 1,
        'guard rail: the pre-fix shape is expected to pile up channels');
    client.disconnect();
});

test('connection loss recovers to exactly one channel, then cleans up', async () => {
    const client = newClient();
    const statuses = [];
    const unmount = mountFixed(client, s => statuses.push(s));
    await sleep(100);

    dropConnection();
    await sleep(RETRY_MS * 20);

    assert.equal(client.getChannels().length, 1,
        `expected one live channel after recovery, statuses=[${statuses}]`);
    assert.ok(statuses.filter(s => s === 'SUBSCRIBED').length >= 2,
        `expected a resubscribe after the outage, statuses=[${statuses}]`);

    unmount();
    await sleep(RETRY_MS * 5);
    assert.equal(client.getChannels().length, 0, 'cleanup must still work after a reconnect');
    client.disconnect();
});

test('one outage causes exactly one resubscribe, not perpetual churn', async () => {
    // Without the generation guard, the CLOSED emitted by our own
    // removeChannel(stale) scheduled another retry, looping forever.
    const client = newClient();
    const statuses = [];
    const unmount = mountFixed(client, s => statuses.push(s));
    await sleep(100);

    dropConnection();
    await sleep(RETRY_MS * 30);   // long settled window

    const subscribes = statuses.filter(s => s === 'SUBSCRIBED').length;
    assert.equal(subscribes, 2,
        `expected initial + one recovery, got ${subscribes}: [${statuses}]`);
    assert.equal(client.getChannels().length, 1);

    unmount();
    client.disconnect();
});

test('without the generation guard, one outage churns forever', async () => {
    const client = newClient();
    const statuses = [];
    const unmount = mountFixed(client, s => statuses.push(s), false);
    await sleep(100);

    dropConnection();
    await sleep(RETRY_MS * 30);

    const subscribes = statuses.filter(s => s === 'SUBSCRIBED').length;
    assert.ok(subscribes > 2,
        `guard rail: without the guard this should churn, got ${subscribes}: [${statuses}]`);

    unmount();
    client.disconnect();
});
