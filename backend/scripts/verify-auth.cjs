// Production authenticate middleware + live profiles; Supabase identity HTTP is explicitly stubbed.
// No password verification, session creation, or writes.
process.env.NODE_ENV = 'production';
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const realFetch = globalThis.fetch;
let identity = null;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith(process.env.SUPABASE_URL + '/auth/v1/user'))
    return new Response(JSON.stringify(identity || { message: 'Invalid token' }), {
      status: identity ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  return realFetch(input, init);
};
const app = require('../dist/app.js').default;
const { pool } = require('../dist/config/postgres.js');
(async () => {
  const results = [];
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.code || e.message });
    }
  }
  async function me() {
    const r = await fetch(base + '/auth/me', {
      headers: { Authorization: 'Bearer identity-fixture' },
    });
    return { status: r.status, body: await r.json() };
  }
  try {
    const demos = (
      await pool.query(
        "SELECT p.id,p.full_name,p.role,u.email,u.email_confirmed_at FROM profiles p JOIN auth.users u ON u.id=p.id WHERE p.full_name IN ('Student Demo','Faculty Demo','Admin Demo')",
      )
    ).rows;
    assert.equal(demos.length, 3);
    for (const p of demos)
      await check(
        `Production middleware uses ${p.full_name} database role despite admin signup metadata`,
        async () => {
          identity = {
            id: p.id,
            email: p.email,
            email_confirmed_at: p.email_confirmed_at,
            user_metadata: { role: 'admin' },
            app_metadata: { role: 'admin' },
            aud: 'authenticated',
          };
          const r = await me();
          assert.equal(r.status, 200);
          assert.equal(r.body.data.role, p.role === 'lab_admin' ? 'admin' : p.role);
        },
      );
    await check('Unverified email denied before profile use', async () => {
      identity = { ...identity, email_confirmed_at: null };
      assert.equal((await me()).status, 403);
    });
    await check('Invalid Supabase identity denied in production', async () => {
      identity = null;
      assert.equal((await me()).status, 401);
    });
  } catch (e) {
    results.push({ name: 'Prerequisites', status: 'FAIL', error: e.code || e.message });
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await pool.end();
    globalThis.fetch = realFetch;
    console.log(
      JSON.stringify(
        {
          mode: 'Production middleware and live demo profile roles, stubbed Supabase identity transport; password login NOT tested',
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
