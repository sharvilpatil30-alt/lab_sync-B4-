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
    await check('All-resource admin filter retains all 432 resources', async()=>{
      const r=await call('/resources?lab=all&type=all&status=all');assert.equal(r.status,200);assert.equal(r.body.data.length,432);
    });
    for(const path of ['/reports/dashboard','/admin/audit','/admin/scheduling']) {
      await check('Admin live '+path,async()=>{const r=await call(path,{headers:headers('admin')});assert.equal(r.status,200);if(path.includes('reports')){assert.equal(r.body.data.labUtilization.length,12);assert.equal(r.body.data.resourceUtilization.length,432);}else assert.ok(Array.isArray(r.body.data));});
      await check('Student denied '+path,async()=>{assert.equal((await call(path,{headers:headers('student')})).status,403);});
    }
    await check('Profile role escalation rejected',async()=>{assert.equal((await call('/users/me',{method:'PATCH',headers:headers('student'),body:JSON.stringify({role:'admin'})})).status,403);});
    await check('Student inventory mutation denied',async()=>{assert.equal((await call('/resources/'+resources[0].id,{method:'PATCH',headers:headers('student'),body:JSON.stringify({operationalStatus:'maintenance'})})).status,403);});
    await check('Invalid report date rejected',async()=>{assert.equal((await call('/reports/dashboard?startDate=invalid',{headers:headers('admin')})).status,400);});
    await check('Admin inventory status/audit changes rollback without new bookings',async()=>{
      const {changeInventory}=require('../dist/modules/admin/routes.js');const db=await pool.connect();
      try{await db.query('BEGIN');const before=(await db.query("SELECT r.* FROM resources r WHERE r.state='AVAILABLE' AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.resource_id=r.id AND b.end_at>now() AND b.state IN ('LEASED','CONFIRMED','ACTIVE','REQUESTED','QUEUED')) LIMIT 1")).rows[0];assert.ok(before);
      await changeInventory(db,{id:profile.id},before.id,'resource','maintenance');assert.equal((await db.query('SELECT state FROM resources WHERE id=$1',[before.id])).rows[0].state,'MAINTENANCE');
      await changeInventory(db,{id:profile.id},before.id,'resource','available');assert.equal((await db.query('SELECT state FROM resources WHERE id=$1',[before.id])).rows[0].state,'AVAILABLE');
      assert.ok((await db.query("SELECT 1 FROM audit_log WHERE action='INVENTORY_STATUS_UPDATED' AND after->>'target'=$1",[before.id])).rowCount);
      }finally{await db.query('ROLLBACK');db.release();}
    });
    await check('Prior approved bookings remain terminal; no new test bookings', async()=>{
      const rows=(await pool.query("SELECT b.id,b.state FROM bookings b JOIN audit_log a ON a.after->>'booking_id'=b.id::text WHERE a.action='BOOKING_COMMIT' AND a.after->>'purpose'='INTEGRATION_TEST_20261014_DO_NOT_USE' ORDER BY b.id")).rows;
      assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.state).sort(),['CANCELLED','COMPLETED']);
    });
    await check('Resource detail loads persisted metadata',async()=>{const r=await call('/resources/'+resources[0].id);assert.equal(r.status,200);assert.equal(r.body.data.id,resources[0].id);});
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
