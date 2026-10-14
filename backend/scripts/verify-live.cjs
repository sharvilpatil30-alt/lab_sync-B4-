// Explicitly approved two-booking live test. Only verified Student Demo, unused AVAILABLE resource.
// Refuses reruns if the exact marker exists. No account/schema changes or deletion.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict'),
  { randomUUID } = require('node:crypto'),
  { spawn } = require('node:child_process'),
  jwt = require('jsonwebtoken');
const { pool } = require('../dist/config/postgres.js');
const { config } = require('../dist/config/env.js');
const marker = 'INTEGRATION_TEST_20261014_DO_NOT_USE',
  results = [],
  created = [];
let child, base, user, token, resource;
async function check(name, fn) {
  const start = performance.now();
  try {
    await fn();
    results.push({ name, status: 'PASS', ms: +(performance.now() - start).toFixed(1) });
  } catch (e) {
    results.push({ name, status: 'FAIL', error: e.code || e.message });
    throw e;
  }
}
async function boot() {
  child = spawn(
    process.execPath,
    [
      '-e',
      "const app=require('./dist/app.js').default;const server=app.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));",
    ],
    {
      cwd: require('node:path').join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    },
  );
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Backend startup timeout')), 10000);
    child.once('message', (m) => {
      clearTimeout(timeout);
      resolve(m.port);
    });
    child.once('exit', () => reject(new Error('Backend exited')));
  });
  base = `http://127.0.0.1:${port}/api/v1`;
}
async function stop() {
  if (child) {
    const c = child;
    child = null;
    await new Promise((r) => {
      c.once('exit', r);
      c.kill();
    });
  }
}
async function call(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}
(async () => {
  try {
    await check('Verified demo identity and isolated resource prerequisites', async () => {
      user = (
        await pool.query(
          "SELECT p.id,p.role,u.email FROM profiles p JOIN auth.users u ON u.id=p.id WHERE p.full_name='Student Demo' AND p.role='student' AND u.email_confirmed_at IS NOT NULL",
        )
      ).rows[0];
      assert.ok(user, 'No verified Student Demo; no writes permitted');
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int n FROM audit_log WHERE action='BOOKING_COMMIT' AND after->>'purpose'=$1",
            [marker],
          )
        ).rows[0].n,
        0,
        'Marker already exists; refusing rerun to enforce two-record maximum',
      );
      resource = (
        await pool.query(
          "SELECT r.id,r.lab_id,r.state FROM resources r WHERE r.state='AVAILABLE' AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.resource_id=r.id) ORDER BY r.id LIMIT 1",
        )
      ).rows[0];
      assert.ok(resource, 'No completely unused AVAILABLE resource; no writes permitted');
    });
    // Local test-signed transport credentials use the real trusted demo profile; this is NOT a Supabase password login test.
    token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: '10m' });
    await boot();
    const start = new Date(Date.now() + 30 * 86400000);
    start.setUTCMinutes(0, 0, 0);
    const body = {
      labId: resource.lab_id,
      resourceId: resource.id,
      startTime: start.toISOString(),
      endTime: new Date(+start + 3600000).toISOString(),
      purpose: marker,
      idempotencyKey: randomUUID(),
    };
    let first;
    await check('Concurrent HTTP booking attempts: exactly one 201 and one 409', async () => {
      const outcomes = await Promise.all(
        [1, 2].map(() => call('/bookings', 'POST', { ...body, idempotencyKey: randomUUID() })),
      );
      for (const r of outcomes)
        if (r.status === 201) {
          created.push(r.body.data.id);
          first = r.body.data;
        }
      assert.deepEqual(outcomes.map((r) => r.status).sort(), [201, 409]);
      assert.equal(created.length, 1);
    });
    await check('Booking and purpose survive actual backend process restart', async () => {
      await stop();
      await boot();
      const r = await call('/bookings/' + first.id);
      assert.equal(r.status, 200);
      assert.equal(r.body.data.state, 'CONFIRMED');
      assert.equal(r.body.data.purpose, marker);
      const own = await call('/bookings/my');
      assert.ok(own.body.data.some((b) => b.id === first.id));
    });
    await check('First test booking cancellation persists', async () => {
      const r = await call('/bookings/' + first.id + '/cancel', 'POST', {
        reason: marker + ' cleanup',
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.state, 'CANCELLED');
    });
    let second;
    await check('Second labelled booking can reuse released time slot', async () => {
      const r = await call('/bookings', 'POST', { ...body, idempotencyKey: randomUUID() });
      if (r.status === 201) {
        second = r.body.data;
        created.push(second.id);
      }
      assert.equal(r.status, 201);
    });
    await check('Second test booking return completes and releases inventory', async () => {
      const r = await call('/bookings/' + second.id + '/return', 'POST', {});
      assert.equal(r.status, 200);
      assert.equal(r.body.data.state, 'COMPLETED');
      assert.equal(
        (await pool.query('SELECT state FROM resources WHERE id=$1', [resource.id])).rows[0].state,
        'AVAILABLE',
      );
    });
    await check('Both final states survive another backend restart', async () => {
      await stop();
      await boot();
      assert.equal((await call('/bookings/' + first.id)).body.data.state, 'CANCELLED');
      assert.equal((await call('/bookings/' + second.id)).body.data.state, 'COMPLETED');
    });
  } catch (e) {
    if (!results.some((r) => r.status === 'FAIL'))
      results.push({ name: 'Execution', status: 'FAIL', error: e.code || e.message });
  } finally {
    for (const id of created) {
      try {
        const b = (await pool.query('SELECT state FROM bookings WHERE id=$1', [id])).rows[0];
        if (b && !['CANCELLED', 'COMPLETED'].includes(b.state)) {
          if (!child) await boot();
          const r = await call('/bookings/' + id + '/cancel', 'POST', {
            reason: marker + ' cleanup',
          });
          assert.equal(r.status, 200);
        }
      } catch (e) {
        results.push({ name: 'Cleanup ' + id, status: 'FAIL', error: e.message });
      }
    }
    const final = created.length
      ? (await pool.query('SELECT id,state FROM bookings WHERE id=ANY($1::uuid[])', [created])).rows
      : [];
    await stop();
    await pool.end();
    console.log(
      JSON.stringify(
        {
          marker,
          mode: 'Live committed HTTP operations with verified demo profile and local signed test transport; real backend restart',
          demoEmail: user?.email,
          resourceId: resource?.id,
          results,
          bookings: final,
          pass: results.filter((r) => r.status === 'PASS').length,
          fail: results.filter((r) => r.status === 'FAIL').length,
        },
        null,
        2,
      ),
    );
    if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
  }
})();
