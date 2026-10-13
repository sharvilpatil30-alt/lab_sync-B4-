import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import app from '../../app.js';
import { campusDb } from '../persistence/database.js';

test('Integration: Authentication, Labs, Resources, Bookings, Concurrency, and Routing', async () => {
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const request = async (path: string, options: any = {}): Promise<{ status: number; body: any }> => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const body: any = await res.json().catch(() => null);
    return { status: res.status, body };
  };

  try {
    // 1. Health check
    const health = await request('/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.success, true);

    // 2. Authentication Login (Real token generation)
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@campus.edu', password: 'any_password' }),
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    assert.ok(loginRes.body.data.token);
    assert.equal(loginRes.body.data.user.role, 'student');
    const studentToken = loginRes.body.data.token;
    const authHeaders = { Authorization: `Bearer ${studentToken}` };

    // 3. Verify session /auth/me
    const meRes = await request('/auth/me', { headers: authHeaders });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.role, 'student');

    // 4. Lab search & list
    const labsRes = await request('/labs');
    assert.equal(labsRes.status, 200);
    assert.equal(labsRes.body.success, true);
    assert.equal(labsRes.body.data.length, 12); // All 12 CSE labs
    const d08Lab = labsRes.body.data.find((l: any) => l.lab_code === 'D-08');
    assert.ok(d08Lab);
    assert.equal(d08Lab.node_id, 'node_d08');

    // 5. Resource availability query for Lab D-08
    const startAt = new Date(Date.now() + 3600000).toISOString();
    const endAt = new Date(Date.now() + 7200000).toISOString();
    const availRes = await request(`/resources/available?labId=D-08&startTime=${encodeURIComponent(startAt)}&endTime=${encodeURIComponent(endAt)}`);
    assert.equal(availRes.status, 200);
    assert.equal(availRes.body.success, true);
    assert.ok(availRes.body.data.resources.length > 0);
    const availableResource = availRes.body.data.resources.find((r: any) => r.available);
    assert.ok(availableResource, 'At least one resource should be available');

    // 6. Booking creation via POST /bookings
    const idempotencyKey = `e2e-idemp-${Date.now()}`;
    const createBookingRes = await request('/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        labId: 'lab-d08',
        resourceId: availableResource.id,
        startTime: startAt,
        endTime: endAt,
        idempotencyKey,
      }),
    });
    assert.equal(createBookingRes.status, 201);
    assert.equal(createBookingRes.body.success, true);
    const createdBooking = createBookingRes.body.data;
    assert.ok(createdBooking.id);
    assert.equal(createdBooking.state, 'CONFIRMED');

    // 7. Duplicate booking prevention (Idempotency check)
    const dupBookingRes = await request('/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        labId: 'lab-d08',
        resourceId: availableResource.id,
        startTime: startAt,
        endTime: endAt,
        idempotencyKey,
      }),
    });
    assert.equal(dupBookingRes.status, 200);
    assert.equal(dupBookingRes.body.data.id, createdBooking.id, 'Duplicate request returned original booking');

    // 8. Overlap conflict prevention: different user trying to book same allocated resource at same time
    const facultyLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'faculty@campus.edu', password: 'any' }),
    });
    const facultyHeaders = { Authorization: `Bearer ${facultyLogin.body.data.token}` };

    // Query availability again: availableResource should no longer be free during that slot
    const availAfterRes = await request(`/resources/available?labId=D-08&startTime=${encodeURIComponent(startAt)}&endTime=${encodeURIComponent(endAt)}`);
    const resState = availAfterRes.body.data.resources.find((r: any) => r.id === availableResource.id);
    assert.equal(resState.available, false, 'Booked resource must be marked unavailable for overlapping slot');

    // 9. Booking details retrieval
    const detailsRes = await request(`/bookings/${createdBooking.id}`, { headers: authHeaders });
    assert.equal(detailsRes.status, 200);
    assert.equal(detailsRes.body.data.id, createdBooking.id);

    // 10. Booking-to-lab routing via GET /routes/:bookingId
    const routeRes = await request(`/routes/${createdBooking.id}`);
    assert.equal(routeRes.status, 200);
    assert.equal(routeRes.body.success, true);
    assert.equal(routeRes.body.data.destinationNodeId, 'node_d08');
    assert.equal(routeRes.body.data.distanceMeters, 38); // Official D-08 distance from CSE porch

    // 11. Booking cancellation
    const cancelRes = await request(`/bookings/${createdBooking.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'Lab session rescheduled' }),
    });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.state, 'CANCELLED');

    // 12. Verify resource is released back to AVAILABLE after cancellation
    const availAfterCancel = await request(`/resources/available?labId=D-08&startTime=${encodeURIComponent(startAt)}&endTime=${encodeURIComponent(endAt)}`);
    const resStateAfterCancel = availAfterCancel.body.data.resources.find((r: any) => r.id === availableResource.id);
    assert.equal(resStateAfterCancel.available, true, 'Resource should be released back to AVAILABLE');

    // 13. Invalid inputs test
    const invalidLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@campus.edu', password: 'wrong' }),
    });
    assert.equal(invalidLogin.status, 401);

    const invalidBooking = await request('/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ labId: 'lab-nonexistent', startTime: 'invalid', endTime: 'invalid' }),
    });
    assert.equal(invalidBooking.status, 422);

    const invalidRoute = await request('/routes/BK-nonexistent-999');
    assert.equal(invalidRoute.status, 400);

  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
