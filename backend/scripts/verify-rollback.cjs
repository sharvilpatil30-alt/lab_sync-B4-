// Live PostgreSQL integration test. The outer transaction is always rolled back.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pool } = require('../dist/config/postgres.js');
const {
  createPersistentBooking,
  transitionPersistentBooking,
} = require('../dist/modules/bookings/persistent.js');
(async () => {
  const db = await pool.connect();
  const results = [];
  async function check(name, fn) {
    const start = performance.now();
    await db.query('SAVEPOINT test_case');
    try {
      await fn();
      await db.query('RELEASE SAVEPOINT test_case');
      results.push({ name, status: 'PASS', ms: +(performance.now() - start).toFixed(1) });
    } catch (e) {
      await db.query('ROLLBACK TO SAVEPOINT test_case');
      results.push({ name, status: 'FAIL', error: e.code || e.message });
    }
  }
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='5s'");
    await db.query("SET LOCAL statement_timeout='10s'");
    const user = (await db.query('SELECT id,role FROM profiles ORDER BY created_at LIMIT 1'))
      .rows[0];
    assert.ok(user, 'Existing profile required');
    const student = { ...user, role: 'student' };
    const resource = (
      await db.query("SELECT * FROM resources WHERE state<>'MAINTENANCE' ORDER BY id LIMIT 1")
    ).rows[0];
    const start = new Date(Date.now() + 90 * 86400000),
      end = new Date(+start + 3600000);
    const body = {
      labId: resource.lab_id,
      resourceId: resource.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      purpose: 'ROLLBACK ONLY integration test',
      idempotencyKey: randomUUID(),
    };
    let booking, facultyBooking;
    await check('Create valid booking with real foreign keys', async () => {
      booking = (await createPersistentBooking(db, student, body)).booking;
      assert.equal(booking.state, 'CONFIRMED');
    });
    await check('Replay and inventory allocation', async () => {
      assert.equal((await createPersistentBooking(db, student, body)).booking.id, booking.id);
      assert.equal(
        (await db.query('SELECT state FROM resources WHERE id=$1', [resource.id])).rows[0].state,
        'ALLOCATED',
      );
    });
    await check('Student overlap rejected', async () => {
      await assert.rejects(
        createPersistentBooking(db, student, { ...body, idempotencyKey: randomUUID() }),
        (e) => e.statusCode === 409,
      );
    });
    await check('Cross-user cancellation denied', async () => {
      await assert.rejects(
        transitionPersistentBooking(
          db,
          { id: randomUUID(), role: 'student' },
          booking.id,
          'CANCELLED',
        ),
        (e) => e.statusCode === 403,
      );
    });
    await check('Cross-lab resource denied', async () => {
      const other = (await db.query('SELECT id FROM labs WHERE id<>$1 LIMIT 1', [resource.lab_id]))
        .rows[0];
      await assert.rejects(
        createPersistentBooking(db, student, { ...body, labId: other.id }),
        (e) => e.statusCode === 400,
      );
    });
    await check('Invalid time, missing purpose rejected', async () => {
      for (const b of [
        { ...body, endTime: body.startTime },
        { ...body, purpose: '' },
        { ...body, startTime: 'invalid' },
        {
          ...body,
          startTime: '2020-01-01T10:00:00Z',
          endTime: '2020-01-01T11:00:00Z',
          idempotencyKey: randomUUID(),
        },
      ])
        await assert.rejects(createPersistentBooking(db, student, b), (e) => e.statusCode === 400);
    });
    await check('Faculty preemption using trusted-role test fixture', async () => {
      facultyBooking = (
        await createPersistentBooking(
          db,
          { ...user, role: 'faculty' },
          { ...body, idempotencyKey: randomUUID() },
        )
      ).booking;
      assert.equal(facultyBooking.cancelledStudentBookingsCount, 1);
      assert.equal(
        (await db.query('SELECT state FROM bookings WHERE id=$1', [booking.id])).rows[0].state,
        'CANCELLED',
      );
    });
    await check(
      'Preemption notification and purpose audit persisted within transaction',
      async () => {
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int n FROM audit_log WHERE action='BOOKING_NOTIFICATION' AND after->>'relatedEntityId'=$1",
              [booking.id],
            )
          ).rows[0].n,
          1,
        );
        assert.equal(
          (
            await db.query(
              "SELECT after->>'purpose' purpose FROM audit_log WHERE action='BOOKING_COMMIT' AND after->>'booking_id'=$1",
              [facultyBooking.id],
            )
          ).rows[0].purpose,
          body.purpose,
        );
      },
    );
    await check(
      'Faculty cannot preempt faculty; student cannot elevate through payload',
      async () => {
        for (const role of ['student', 'faculty'])
          await assert.rejects(
            createPersistentBooking(
              db,
              { ...user, role },
              { ...body, idempotencyKey: randomUUID(), role: 'admin', priority: 0 },
            ),
            (e) => e.statusCode === 409,
          );
      },
    );
    await check('Cancellation does not release resource with another future booking', async () => {
      const second = (
        await createPersistentBooking(db, student, {
          ...body,
          idempotencyKey: randomUUID(),
          startTime: end.toISOString(),
          endTime: new Date(+end + 3600000).toISOString(),
        })
      ).booking;
      await transitionPersistentBooking(
        db,
        { ...user, role: 'faculty' },
        facultyBooking.id,
        'CANCELLED',
      );
      assert.equal(
        (await db.query('SELECT state FROM resources WHERE id=$1', [resource.id])).rows[0].state,
        'ALLOCATED',
      );
      await transitionPersistentBooking(db, student, second.id, 'COMPLETED');
      assert.equal(
        (await db.query('SELECT state FROM resources WHERE id=$1', [resource.id])).rows[0].state,
        'AVAILABLE',
      );
    });
    await check('Terminal booking cannot be reactivated', async () => {
      await assert.rejects(
        transitionPersistentBooking(db, student, booking.id, 'CONFIRMED'),
        (e) => e.statusCode === 400,
      );
    });
  } catch (e) {
    results.push({
      name: 'Prerequisites/dependencies',
      status: 'FAIL',
      error: e.code || e.message,
    });
  } finally {
    await db.query('ROLLBACK');
    db.release();
    await pool.end();
    console.log(
      JSON.stringify(
        {
          mode: 'All changes rolled back; role fixtures do not test real Supabase login',
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
