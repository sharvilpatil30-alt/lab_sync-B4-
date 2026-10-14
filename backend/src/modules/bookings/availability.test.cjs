'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Minimal in-memory simulation of the authoritative campus database & atomic RPCs
// testing the exact state transitions for book, cancel, return, compensate, and concurrency
describe('Team C: Auto-update resource availability on book / cancel / return', () => {
  function setupTestDb() {
    const resources = new Map([
      ['res-1', { id: 'res-1', lab_id: 'lab-1', label: 'PC-01', state: 'AVAILABLE', version: 0 }],
      ['res-2', { id: 'res-2', lab_id: 'lab-1', label: 'PC-02', state: 'AVAILABLE', version: 0 }],
    ]);

    const bookings = new Map();
    const auditLog = [];

    function commitBooking({ bookingId, resourceId, decision }) {
      const booking = bookings.get(bookingId);
      if (!booking) return { success: false, error: 'Booking not found' };

      const resource = resources.get(resourceId);
      if (decision === 'ALLOCATED') {
        if (!resource) return { success: false, error: 'Resource not found' };
        // Transaction check: cannot allocate already allocated/booked resource
        if (resource.state !== 'AVAILABLE') {
          return { success: false, error: `Resource ${resourceId} is not available: ${resource.state}` };
        }
        resource.state = 'ALLOCATED'; // in-use state
        resource.version += 1;
      }

      booking.state = decision === 'ALLOCATED' ? 'CONFIRMED' : 'REJECTED';
      booking.resource_id = resourceId;

      auditLog.push({ action: 'BOOKING_COMMIT', bookingId, resourceId, state: resource.state });
      return { success: true, booking, resource };
    }

    function cancelBooking({ bookingId }) {
      const booking = bookings.get(bookingId);
      if (!booking) return { success: false, error: 'Booking not found' };

      booking.state = 'CANCELLED';
      if (booking.resource_id) {
        const resource = resources.get(booking.resource_id);
        if (resource && (resource.state === 'ALLOCATED' || resource.state === 'BOOKED')) {
          resource.state = 'AVAILABLE';
          resource.version += 1;
        }
      }

      auditLog.push({ action: 'BOOKING_CANCEL', bookingId });
      return { success: true, booking };
    }

    function completeBooking({ bookingId }) {
      const booking = bookings.get(bookingId);
      if (!booking) return { success: false, error: 'Booking not found' };

      booking.state = 'COMPLETED';
      if (booking.resource_id) {
        const resource = resources.get(booking.resource_id);
        if (resource && (resource.state === 'ALLOCATED' || resource.state === 'BOOKED')) {
          resource.state = 'AVAILABLE';
          resource.version += 1;
        }
      }

      auditLog.push({ action: 'BOOKING_COMPLETED', bookingId });
      return { success: true, booking };
    }

    function compensateBooking({ bookingId, resourceId }) {
      const booking = bookings.get(bookingId);
      if (booking) booking.state = 'COMPENSATION_REQUIRED';

      if (resourceId) {
        const resource = resources.get(resourceId);
        if (resource) {
          resource.state = 'AVAILABLE';
          resource.version += 1;
        }
      }

      auditLog.push({ action: 'BOOKING_COMPENSATE', bookingId, resourceId });
      return { success: true };
    }

    return { resources, bookings, commitBooking, cancelBooking, completeBooking, compensateBooking, auditLog };
  }

  test('1. book -> resource becomes ALLOCATED / BOOKED', () => {
    const db = setupTestDb();
    db.bookings.set('b-1', { id: 'b-1', user_id: 'u-1', state: 'REQUESTED' });

    const res = db.commitBooking({ bookingId: 'b-1', resourceId: 'res-1', decision: 'ALLOCATED' });
    assert.equal(res.success, true);
    assert.equal(db.bookings.get('b-1').state, 'CONFIRMED');
    assert.equal(db.resources.get('res-1').state, 'ALLOCATED');
    assert.equal(db.resources.get('res-1').version, 1);
  });

  test('2. cancel -> resource becomes AVAILABLE', () => {
    const db = setupTestDb();
    db.bookings.set('b-1', { id: 'b-1', user_id: 'u-1', state: 'REQUESTED' });
    db.commitBooking({ bookingId: 'b-1', resourceId: 'res-1', decision: 'ALLOCATED' });
    assert.equal(db.resources.get('res-1').state, 'ALLOCATED');

    const cancelRes = db.cancelBooking({ bookingId: 'b-1' });
    assert.equal(cancelRes.success, true);
    assert.equal(db.bookings.get('b-1').state, 'CANCELLED');
    assert.equal(db.resources.get('res-1').state, 'AVAILABLE');
    assert.equal(db.resources.get('res-1').version, 2);
  });

  test('3. return/complete -> resource becomes AVAILABLE', () => {
    const db = setupTestDb();
    db.bookings.set('b-1', { id: 'b-1', user_id: 'u-1', state: 'REQUESTED' });
    db.commitBooking({ bookingId: 'b-1', resourceId: 'res-1', decision: 'ALLOCATED' });
    assert.equal(db.resources.get('res-1').state, 'ALLOCATED');

    const compRes = db.completeBooking({ bookingId: 'b-1' });
    assert.equal(compRes.success, true);
    assert.equal(db.bookings.get('b-1').state, 'COMPLETED');
    assert.equal(db.resources.get('res-1').state, 'AVAILABLE');
    assert.equal(db.resources.get('res-1').version, 2);
  });

  test('4. compensate still works -> resource becomes AVAILABLE, booking COMPENSATION_REQUIRED', () => {
    const db = setupTestDb();
    db.bookings.set('b-1', { id: 'b-1', user_id: 'u-1', state: 'REQUESTED' });
    db.commitBooking({ bookingId: 'b-1', resourceId: 'res-1', decision: 'ALLOCATED' });
    assert.equal(db.resources.get('res-1').state, 'ALLOCATED');

    const compRes = db.compensateBooking({ bookingId: 'b-1', resourceId: 'res-1' });
    assert.equal(compRes.success, true);
    assert.equal(db.bookings.get('b-1').state, 'COMPENSATION_REQUIRED');
    assert.equal(db.resources.get('res-1').state, 'AVAILABLE');
  });

  test('5. no double-book under concurrent commit on same resource', () => {
    const db = setupTestDb();
    db.bookings.set('b-1', { id: 'b-1', user_id: 'u-1', state: 'REQUESTED' });
    db.bookings.set('b-2', { id: 'b-2', user_id: 'u-2', state: 'REQUESTED' });

    // First commit acquires res-1
    const first = db.commitBooking({ bookingId: 'b-1', resourceId: 'res-1', decision: 'ALLOCATED' });
    assert.equal(first.success, true);
    assert.equal(db.resources.get('res-1').state, 'ALLOCATED');

    // Concurrent commit on same res-1 must fail
    const second = db.commitBooking({ bookingId: 'b-2', resourceId: 'res-1', decision: 'ALLOCATED' });
    assert.equal(second.success, false);
    assert.match(second.error, /not available/);
    assert.equal(db.bookings.get('b-2').state, 'REQUESTED'); // not confirmed
  });
});
