process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import express from 'express';
import { bookingRouter } from './legacy-test-routes.js';
import { authRouter } from '../auth/routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';
const app=express();
app.use(express.json());
app.get('/api/v1/health', (_req,res)=>res.json({success:true}));
app.use('/api/v1/bookings',bookingRouter);
app.use('/api/v1/auth',authRouter);
app.get('/api/v1/notifications',(req,res)=> { const token=req.headers.authorization?.slice(7) || ''; const u=jwt.verify(token,config.jwtSecret) as any; res.json({success:true,data:campusDb.getNotificationsForUser(u.id)}); });
app.use(errorHandler);
import { config } from '../../config/env.js';
import { campusDb } from '../persistence/database.js';
import { DFDOrchestrator } from '../ui-bff/orchestrator.js';

test('Legacy memory regression & OS Scheduler: Booking Priority, Conflict Preemption, Notifications and Concurrency', async (t) => {
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

    // 2. Authentication Tokens (Direct test-signed JWTs)
    const studentToken = jwt.sign(
      { id: 'usr-student-01', role: 'student', name: 'Alex Chen' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    const authHeaders = { Authorization: `Bearer ${studentToken}` };

    // 3. Verify session /auth/me
    const meRes = await request('/auth/me', { headers: authHeaders });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.role, 'student');

    // Faculty token
    const facultyToken = jwt.sign(
      { id: 'usr-faculty-01', role: 'faculty', name: 'Prof. Rajesh Kulkarni' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    const facultyHeaders = { Authorization: `Bearer ${facultyToken}` };

    // 5. Basic booking creation and cancellation flow
    const baseStart = new Date(Date.now() + 3600000 * 20).toISOString();
    const baseEnd = new Date(Date.now() + 3600000 * 21).toISOString();
    const baseIdemp = `base-idemp-${Date.now()}`;

    const basicBookingRes = await request('/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        labId: 'lab-d08',
        resourceId: 'res-ai-gpu-01',
        startTime: baseStart,
        endTime: baseEnd,
        idempotencyKey: baseIdemp,
      }),
    });
    assert.equal(basicBookingRes.status, 201);
    const basicBooking = basicBookingRes.body.data;

    // Idempotency check: duplicate booking returns original
    const dupRes = await request('/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        labId: 'lab-d08',
        resourceId: 'res-ai-gpu-01',
        startTime: baseStart,
        endTime: baseEnd,
        idempotencyKey: baseIdemp,
      }),
    });
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.data.id, basicBooking.id);

    // Cancel basic booking
    const cancelBasic = await request(`/bookings/${basicBooking.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'Initial test clean up' }),
    });
    assert.equal(cancelBasic.status, 200);
    assert.equal(cancelBasic.body.data.state, 'CANCELLED');

    // =========================================================================
    // Scenario 1 & 2: Faculty Booking Priority & Automatic Cancellation of Student Booking
    // =========================================================================
    await t.test('Scenario 1 & 2: Conflicting student booking is cancelled when faculty books overlapping slot', async () => {
      const slotStart = new Date(Date.now() + 3600000 * 30).toISOString();
      const slotEnd = new Date(Date.now() + 3600000 * 32).toISOString(); // 2-hour slot

      // 1. Student books Lab D-08, resource res-ai-gpu-01
      const studentBookingRes = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-01',
          startTime: slotStart,
          endTime: slotEnd,
          purpose: 'Machine learning student assignment',
        }),
      });
      assert.equal(studentBookingRes.status, 201);
      const studentBookingId = studentBookingRes.body.data.id;
      assert.equal(studentBookingRes.body.data.state, 'CONFIRMED');

      // 2. Faculty member books overlapping window (e.g. middle 1 hour of the student slot)
      const facultyStart = new Date(Date.now() + 3600000 * 30.5).toISOString();
      const facultyEnd = new Date(Date.now() + 3600000 * 31.5).toISOString();

      const facultyBookingRes = await request('/bookings', {
        method: 'POST',
        headers: facultyHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-01',
          startTime: facultyStart,
          endTime: facultyEnd,
          purpose: 'Faculty PhD research experiment',
        }),
      });

      // Faculty booking must succeed (201)
      assert.equal(facultyBookingRes.status, 201);
      assert.equal(facultyBookingRes.body.success, true);
      assert.equal(facultyBookingRes.body.data.state, 'CONFIRMED');
      assert.equal(facultyBookingRes.body.data.cancelledStudentBookingsCount, 1);
      assert.match(facultyBookingRes.body.message, /automatically cancelled due to faculty priority/);

      // Student booking must now be CANCELLED with recorded reason
      const verifyStudentBooking = campusDb.bookings.get(studentBookingId);
      assert.ok(verifyStudentBooking);
      assert.equal(verifyStudentBooking.state, 'CANCELLED');
      assert.ok(verifyStudentBooking.cancellation_reason);
      assert.match(verifyStudentBooking.cancellation_reason, /higher-priority faculty booking/);
    });

    // =========================================================================
    // Scenario 3: Non-overlapping bookings remain valid
    // =========================================================================
    await t.test('Scenario 3: Non-overlapping bookings remain valid', async () => {
      const studentStart = new Date(Date.now() + 3600000 * 40).toISOString();
      const studentEnd = new Date(Date.now() + 3600000 * 41).toISOString();

      const studentRes = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-02',
          startTime: studentStart,
          endTime: studentEnd,
        }),
      });
      assert.equal(studentRes.status, 201);
      const studentBookingId = studentRes.body.data.id;

      // Faculty books subsequent non-overlapping slot: 41h to 42h
      const facultyStart = new Date(Date.now() + 3600000 * 41).toISOString();
      const facultyEnd = new Date(Date.now() + 3600000 * 42).toISOString();

      const facultyRes = await request('/bookings', {
        method: 'POST',
        headers: facultyHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-02',
          startTime: facultyStart,
          endTime: facultyEnd,
        }),
      });
      assert.equal(facultyRes.status, 201);

      // Student booking must still be CONFIRMED
      const checkStudent = campusDb.bookings.get(studentBookingId);
      assert.equal(checkStudent?.state, 'CONFIRMED');
    });

    // =========================================================================
    // Scenario 4: Bookings for different labs remain unaffected
    // =========================================================================
    await t.test('Scenario 4: Bookings for different labs remain unaffected', async () => {
      const timeStart = new Date(Date.now() + 3600000 * 50).toISOString();
      const timeEnd = new Date(Date.now() + 3600000 * 52).toISOString();

      // Student books Linux Lab (lab-d01)
      const studentLinux = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-d01',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      assert.equal(studentLinux.status, 201);
      const linuxBookingId = studentLinux.body.data.id;

      // Faculty books AI Lab (lab-d08) for exact same overlapping time window
      const facultyAI = await request('/bookings', {
        method: 'POST',
        headers: facultyHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      assert.equal(facultyAI.status, 201);

      // Linux Lab booking must remain CONFIRMED
      const checkLinux = campusDb.bookings.get(linuxBookingId);
      assert.equal(checkLinux?.state, 'CONFIRMED');
    });

    // =========================================================================
    // Scenario 5: Faculty-versus-faculty conflicts follow policy
    // =========================================================================
    await t.test('Scenario 5: Faculty-versus-faculty conflict does not cancel; returns conflict response', async () => {
      const timeStart = new Date(Date.now() + 3600000 * 60).toISOString();
      const timeEnd = new Date(Date.now() + 3600000 * 62).toISOString();

      // First faculty booking (Dr. Sarah Jenkins - usr_faculty_01)
      const tokenFaculty1 = jwt.sign(
        { id: 'usr_faculty_01', role: 'faculty' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
      const headersFaculty1 = { Authorization: `Bearer ${tokenFaculty1}` };

      const firstFacultyRes = await request('/bookings', {
        method: 'POST',
        headers: headersFaculty1,
        body: JSON.stringify({
          labId: 'lab-d05',
          resourceId: 'res-sys-ws-01',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      assert.equal(firstFacultyRes.status, 201);
      const firstBookingId = firstFacultyRes.body.data.id;

      // Second faculty booking (Prof. Rajesh Kulkarni - usr-faculty-01) for overlapping slot
      const tokenFaculty2 = jwt.sign(
        { id: 'usr-faculty-01', role: 'faculty' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
      const headersFaculty2 = { Authorization: `Bearer ${tokenFaculty2}` };

      const secondFacultyRes = await request('/bookings', {
        method: 'POST',
        headers: headersFaculty2,
        body: JSON.stringify({
          labId: 'lab-d05',
          resourceId: 'res-sys-ws-01',
          startTime: new Date(Date.now() + 3600000 * 60.5).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 61.5).toISOString(),
        }),
      });

      // Must NOT silently cancel the first faculty booking; must return 409 conflict
      assert.equal(secondFacultyRes.status, 409);
      assert.match(secondFacultyRes.body.message, /already reserved by another faculty/i);

      // Verify the first faculty member's reservation is STILL CONFIRMED
      const checkFirstFaculty = campusDb.bookings.get(firstBookingId);
      assert.equal(checkFirstFaculty?.state, 'CONFIRMED');
    });

    // =========================================================================
    // Scenario 6: Cancelled or completed bookings are not incorrectly cancelled again
    // =========================================================================
    await t.test('Scenario 6: Cancelled or completed bookings are not cancelled again', async () => {
      const timeStart = new Date(Date.now() + 3600000 * 70).toISOString();
      const timeEnd = new Date(Date.now() + 3600000 * 71).toISOString();

      // Student creates and immediately cancels booking
      const studentRes = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-01',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      const bId = studentRes.body.data.id;

      await request(`/bookings/${bId}/cancel`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: 'Student self-cancelled' }),
      });

      const initialCount = campusDb.notifications.size;

      // Faculty books the exact slot
      const facultyRes = await request('/bookings', {
        method: 'POST',
        headers: facultyHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-01',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });

      assert.equal(facultyRes.status, 201);
      // Cancelled booking count should be 0 since it was already cancelled
      assert.equal(facultyRes.body.data.cancelledStudentBookingsCount, 0);
      assert.equal(campusDb.notifications.size, initialCount, 'No redundant cancellation notification sent');
    });

    // =========================================================================
    // Scenario 7: Immediate Student Notification
    // =========================================================================
    await t.test('Scenario 7: Correct student receives immediate notification with lab name, date, time and reason', async () => {
      const studentId = 'usr_student_01';
      const studentToken2 = jwt.sign({ id: studentId, role: 'student' }, config.jwtSecret, { expiresIn: '1h' });
      const studentHeaders2 = { Authorization: `Bearer ${studentToken2}` };

      const timeStart = new Date(Date.now() + 3600000 * 80).toISOString();
      const timeEnd = new Date(Date.now() + 3600000 * 82).toISOString();

      // Student books
      const sBooking = await request('/bookings', {
        method: 'POST',
        headers: studentHeaders2,
        body: JSON.stringify({
          labId: 'lab-d12',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      assert.equal(sBooking.status, 201);
      const studentBookingId = sBooking.body.data.id;

      // Faculty preempts
      const fBooking = await request('/bookings', {
        method: 'POST',
        headers: facultyHeaders,
        body: JSON.stringify({
          labId: 'lab-d12',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      assert.equal(fBooking.status, 201);

      // Student checks /api/v1/notifications
      const notifsRes = await request('/notifications', { headers: studentHeaders2 });
      assert.equal(notifsRes.status, 200);
      assert.ok(Array.isArray(notifsRes.body.data));

      const relevantNotif = notifsRes.body.data.find(
        (n: any) => n.relatedEntityId === studentBookingId
      );
      assert.ok(relevantNotif, 'Student must receive a notification for the cancelled booking');
      assert.equal(relevantNotif.type, 'warning');
      assert.match(relevantNotif.message, /Augmented Reality\/ Virtual Reality Laboratory|lab-d12/i, 'Must contain lab name');
      assert.match(relevantNotif.message, /Reason:/, 'Must contain cancellation reason');
      assert.match(relevantNotif.message, new RegExp(timeStart.split('T')[0]), 'Must contain booking date');

      // Unrelated user (usr-student-01) must NOT receive this notification
      const otherStudentNotifs = await request('/notifications', { headers: authHeaders });
      const leakedNotif = otherStudentNotifs.body.data.find((n: any) => n.relatedEntityId === studentBookingId);
      assert.equal(leakedNotif, undefined, 'Notification must only go to the affected student');
    });

    // =========================================================================
    // Scenario 8: Database failures do not leave partial booking updates (Rollback)
    // =========================================================================
    await t.test('Scenario 8: Failed pipeline rolls back cleanly leaving no partial cancellations', async () => {
      const timeStart = new Date(Date.now() + 3600000 * 90).toISOString();
      const timeEnd = new Date(Date.now() + 3600000 * 92).toISOString();

      // 1. Student creates confirmed booking
      const sRes = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-01',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      assert.equal(sRes.status, 201);
      const studentBookingId = sRes.body.data.id;

      // 2. Temporarily simulate a database error during commit
      const originalCommit = campusDb.commitBooking.bind(campusDb);
      campusDb.commitBooking = () => {
        return { success: false, error: 'Simulated PostgreSQL connection failure' };
      };

      try {
        const failedFaculty = await request('/bookings', {
          method: 'POST',
          headers: facultyHeaders,
          body: JSON.stringify({
            labId: 'lab-d08',
            resourceId: 'res-ai-gpu-01',
            startTime: timeStart,
            endTime: timeEnd,
          }),
        });

        // Request must fail
        assert.equal(failedFaculty.status, 422);

        // Student booking MUST be restored to CONFIRMED (no partial cancellation!)
        const restoredStudentBooking = campusDb.bookings.get(studentBookingId);
        assert.equal(restoredStudentBooking?.state, 'CONFIRMED', 'Student booking must be restored on commit failure');
      } finally {
        campusDb.commitBooking = originalCommit;
      }

      // 3. Test rollback when notification dispatch fails unexpectedly
      const originalCreateNotif = campusDb.createNotification.bind(campusDb);
      campusDb.createNotification = () => {
        throw new Error('Simulated notification service failure');
      };

      try {
        const failedFacultyNotif = await request('/bookings', {
          method: 'POST',
          headers: facultyHeaders,
          body: JSON.stringify({
            labId: 'lab-d08',
            resourceId: 'res-ai-gpu-01',
            startTime: timeStart,
            endTime: timeEnd,
          }),
        });

        assert.equal(failedFacultyNotif.status, 422);
        assert.match(failedFacultyNotif.body.message, /Database failure during booking pipeline/);

        // Verify student booking is STILL preserved as CONFIRMED
        const checkStudentRestored = campusDb.bookings.get(studentBookingId);
        assert.equal(checkStudentRestored?.state, 'CONFIRMED', 'Student booking must remain CONFIRMED on notification failure');
      } finally {
        campusDb.createNotification = originalCreateNotif;
      }
    });

    // =========================================================================
    // Scenario 9: Concurrent requests cannot create overlapping active reservations
    // =========================================================================
    await t.test('Scenario 9: Concurrent requests cannot produce double bookings', async () => {
      const timeStart = new Date(Date.now() + 3600000 * 100).toISOString();
      const timeEnd = new Date(Date.now() + 3600000 * 101).toISOString();

      // Launch 5 simultaneous requests for the exact same resource
      const promises = Array.from({ length: 5 }, (_, i) =>
        request('/bookings', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            labId: 'lab-d08',
            resourceId: 'res-ai-gpu-01',
            startTime: timeStart,
            endTime: timeEnd,
            idempotencyKey: `concurrent-req-${i}-${Date.now()}`,
          }),
        })
      );

      const results = await Promise.all(promises);

      // Exactly ONE request should be successfully CONFIRMED
      const confirmedResults = results.filter((r) => r.status === 201 && r.body.data?.state === 'CONFIRMED');
      assert.equal(confirmedResults.length, 1, 'Only one concurrent reservation may be CONFIRMED');

      // The remaining requests must be rejected or conflict
      const rejectedResults = results.filter((r) => r.status === 409 || r.status === 422 || r.status === 400);
      assert.equal(rejectedResults.length, 4, 'Remaining 4 requests must fail with conflict');
    });

    // =========================================================================
    // Scenario 10: Students cannot override faculty or tamper with priority
    // =========================================================================
    await t.test('Scenario 10: Students cannot override faculty reservations or self-elevate priority', async () => {
      const timeStart = new Date(Date.now() + 3600000 * 110).toISOString();
      const timeEnd = new Date(Date.now() + 3600000 * 112).toISOString();

      // 1. Faculty books first
      const fRes = await request('/bookings', {
        method: 'POST',
        headers: facultyHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-01',
          startTime: timeStart,
          endTime: timeEnd,
        }),
      });
      assert.equal(fRes.status, 201);
      const facultyBookingId = fRes.body.data.id;

      // 2. Student attempts to book and passes fake priority / role
      const sRes = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          resourceId: 'res-ai-gpu-01',
          startTime: timeStart,
          endTime: timeEnd,
          priority: 0, // Fake admin priority
          role: 'faculty', // Fake faculty role
        }),
      });

      // Must be rejected with 409 conflict (student cannot override faculty)
      assert.equal(sRes.status, 409);
      assert.match(sRes.body.message, /Cannot override existing faculty reservation/i);

      // Faculty booking remains completely safe
      const checkFaculty = campusDb.bookings.get(facultyBookingId);
      assert.equal(checkFaculty?.state, 'CONFIRMED');
    });

    // =========================================================================
    // Additional OS Checks: Authorization & Validation
    // =========================================================================
    await t.test('Authorization & Validation: Unauthorized cancellation and invalid time ranges rejected', async () => {
      // 1. Invalid time window (start >= end)
      const invalidTime = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-d08',
          startTime: '2026-10-20T12:00:00.000Z',
          endTime: '2026-10-20T10:00:00.000Z', // before start!
        }),
      });
      assert.equal(invalidTime.status, 400);

      // 2. Non-existent lab
      const invalidLab = await request('/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          labId: 'lab-nonexistent-99',
          startTime: '2026-10-20T10:00:00.000Z',
          endTime: '2026-10-20T12:00:00.000Z',
        }),
      });
      assert.equal(invalidLab.status, 404);

      // 3. Unauthorized user trying to cancel another user's booking
      const student1Token = jwt.sign({ id: 'usr-student-01', role: 'student' }, config.jwtSecret);
      const student2Token = jwt.sign({ id: 'usr_student_01', role: 'student' }, config.jwtSecret);

      const s1Booking = await request('/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${student1Token}` },
        body: JSON.stringify({
          labId: 'lab-d08',
          startTime: new Date(Date.now() + 3600000 * 120).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 121).toISOString(),
        }),
      });
      assert.equal(s1Booking.status, 201);
      const s1BookingId = s1Booking.body.data.id;

      // Student 2 attempts to cancel Student 1's booking
      const unauthorizedCancel = await request(`/bookings/${s1BookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${student2Token}` },
        body: JSON.stringify({ reason: 'Malicious cancellation attempt' }),
      });
      assert.equal(unauthorizedCancel.status, 403);
    });

  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
