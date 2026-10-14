// Read-only live HTTP probe. Signed role fixtures exercise application routing, not Supabase password login.
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const jwt = require('jsonwebtoken');
const app = require('../dist/app.js').default;
const { pool } = require('../dist/config/postgres.js');
const { config } = require('../dist/config/env.js');
(async () => {
  const results = [];
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function call(path, options = {}) {
    const start = performance.now();
    const res = await fetch(base + path, options);
    const body = await res.json();
    return {
      status: res.status,
      body,
      ms: +(performance.now() - start).toFixed(1),
      headers: res.headers,
    };
  }
  async function check(name, fn) {
    try {
      const details = await fn();
      results.push({ name, status: 'PASS', ...details });
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.code || e.message });
    }
  }
  try {
    const profile = (await pool.query('SELECT id FROM profiles ORDER BY created_at LIMIT 1'))
      .rows[0];
    assert.ok(profile);
    const headers = (role) => ({
      Authorization:
        'Bearer ' + jwt.sign({ id: profile.id, role }, config.jwtSecret, { expiresIn: '5m' }),
      'Content-Type': 'application/json',
    });
    await check('Anonymous auth/me is JSON 401', async () => {
      const r = await call('/auth/me');
      assert.equal(r.status, 401);
      return { ms: r.ms };
    });
    await check('Invalid session is rejected', async () => {
      const r = await call('/auth/me', { headers: { Authorization: 'Bearer invalid' } });
      assert.equal(r.status, 401);
      return { ms: r.ms };
    });
    for (const role of ['student', 'faculty', 'admin', 'lab_admin'])
      await check(`Trusted test-signed ${role} role mapping`, async () => {
        const r = await call('/auth/me', { headers: headers(role) });
        assert.equal(r.status, 200);
        assert.equal(r.body.data.role, role === 'lab_admin' ? 'admin' : role);
        return { ms: r.ms };
      });
    let labs, resources;
    await check('Live labs HTTP count', async () => {
      const r = await call('/labs');
      assert.equal(r.status, 200);
      labs = r.body.data;
      assert.equal(labs.length, 12);
      return { count: labs.length, ms: r.ms };
    });
    await check('Live resources HTTP count', async () => {
      const r = await call('/resources');
      assert.equal(r.status, 200);
      resources = r.body.data;
      assert.equal(resources.length, 432);
      return { count: resources.length, ms: r.ms };
    });
    await check('Real UUID seat availability contract', async () => {
      const r = await call(
        '/resources/available?' +
          new URLSearchParams({
            labId: labs[0].id,
            startTime: new Date(Date.now() + 86400000).toISOString(),
            endTime: new Date(Date.now() + 90000000).toISOString(),
          }),
      );
      assert.equal(r.status, 200);
      assert.ok(r.body.data.resources.length > 0);
      for (const seat of r.body.data.resources) {
        assert.equal(typeof seat.available, 'boolean');
        assert.ok(resources.some((x) => x.id === seat.resourceId));
      }
      return { count: r.body.data.resources.length, ms: r.ms };
    });
    await check('Invalid availability time JSON 400', async () => {
      assert.equal(
        (await call('/resources/available?labId=D-01&startTime=bad&endTime=bad')).status,
        400,
      );
    });
    await check('Monitoring uses live counts', async () => {
      const r = await call('/monitoring/overview', { headers: headers('faculty') });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.totalLabs, 12);
      assert.equal(r.body.data.totalResources, 432);
      return { ms: r.ms };
    });
    for (const path of ['/bookings/my', '/bookings', '/notifications', '/monitoring/alerts'])
      await check(`Authenticated ${path}`, async () => {
        const r = await call(path, { headers: headers('student') });
        assert.equal(r.status, 200);
        assert.ok(Array.isArray(r.body.data));
        return { ms: r.ms };
      });
    await check('Persisted demo booking route uses live lab mapping', async () => {
      const record = (
        await pool.query(
          "SELECT b.id,b.user_id,p.role FROM bookings b JOIN profiles p ON p.id=b.user_id JOIN audit_log a ON a.after->>'booking_id'=b.id::text WHERE a.action='BOOKING_COMMIT' AND a.after->>'purpose'='INTEGRATION_TEST_20261014_DO_NOT_USE' LIMIT 1",
        )
      ).rows[0];
      assert.ok(record);
      const response = await call('/routes/' + record.id, {
        headers: {
          Authorization:
            'Bearer ' +
            jwt.sign({ id: record.user_id, role: record.role }, config.jwtSecret, {
              expiresIn: '5m',
            }),
        },
      });
      assert.equal(response.status, 200);
      assert.ok(response.body.data.path.length > 0);
      return { ms: response.ms };
    });
    await check('Student denied administrator status override', async () => {
      const r = await call('/bookings/unknown/status', {
        method: 'PATCH',
        headers: headers('student'),
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      assert.equal(r.status, 403);
    });
    await check('Cross-origin allowlist rejects unrelated origin', async () => {
      const r = await call('/health', { headers: { Origin: 'https://untrusted.example' } });
      assert.equal(r.headers.get('access-control-allow-origin'), null);
    });
    await check('Configured localhost CORS allowed', async () => {
      const r = await call('/health', { headers: { Origin: 'http://localhost:5173' } });
      assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    });
    if (labs && resources)
      fs.writeFileSync('/tmp/campus-browser-catalog.json', JSON.stringify({ labs, resources }));
  } catch (e) {
    results.push({ name: 'Probe prerequisites', status: 'FAIL', error: e.code || e.message });
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await pool.end();
    console.log(
      JSON.stringify(
        {
          mode: 'Read-only HTTP; local signed role fixtures',
          results,
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
