const http = require('http');
const jwt = require('jsonwebtoken');

const testToken = jwt.sign(
  { id: 'usr-admin-01', role: 'admin', email: 'admin@ritindia.edu', name: 'Dr. Vikramaditya' },
  'dev_secret_key_12345'
);

function request(path, method = 'GET', body = null, token = testToken) {
  return new Promise((resolve) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw: raw.slice(0, 200) });
        }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function run() {
  console.log('=== 1. INVENTORY LABS ===');
  const labsRes = await request('/api/v1/inventory/labs');
  console.log('Status:', labsRes.status, 'Total Labs:', labsRes.body?.count, 'First Lab:', labsRes.body?.data?.[0]?.lab_name);

  console.log('=== 2. INVENTORY SUMMARY ===');
  const sumRes = await request('/api/v1/inventory/summary');
  console.log('Status:', sumRes.status, 'Total Batches:', sumRes.body?.data?.total_batches, 'Total Labs:', sumRes.body?.data?.total_labs, 'Total Models:', sumRes.body?.data?.total_models);

  console.log('=== 3. RESOURCES AVAILABLE ===');
  const availRes = await request('/api/v1/resources/available?labId=lab-d01');
  console.log('Status:', availRes.status, 'Available Seats:', availRes.body?.data?.resources?.length, 'Sample:', availRes.body?.data?.resources?.[0]);

  console.log('=== 4. ROUTE NODES ===');
  const nodesRes = await request('/api/v1/routes/nodes');
  console.log('Status:', nodesRes.status, 'Total Nodes:', nodesRes.body?.data?.nodes?.length);

  console.log('=== 5. ROUTE COMPUTE ===');
  const routeRes = await request('/api/v1/routes/compute', 'POST', { fromNodeId: 'node-main-gate', toNodeId: 'node-lab-ai', algorithm: 'dijkstra' });
  console.log('Status:', routeRes.status, 'Path:', routeRes.body?.data?.path, 'Distance:', routeRes.body?.data?.distance + 'm');

  console.log('=== 6. BOOKING CREATION ===');
  const bookRes = await request('/api/v1/bookings', 'POST', {
    resourceId: 'res-bat0005-1',
    startTime: '2026-10-10T10:00:00.000Z',
    endTime: '2026-10-10T12:00:00.000Z',
    purpose: 'Academic AI GPU experimentation'
  });
  console.log('Status:', bookRes.status, 'Booking ID:', bookRes.body?.data?.bookingId, 'Booking State:', bookRes.body?.data?.status);

  console.log('=== 7. CONCURRENT OVERLAP PREVENTION (HTTP 409) ===');
  const conflictRes = await request('/api/v1/bookings', 'POST', {
    resourceId: 'res-bat0005-1',
    startTime: '2026-10-10T10:30:00.000Z',
    endTime: '2026-10-10T11:30:00.000Z',
    purpose: 'Conflicting student overlap attempt'
  });
  console.log('Status (Should be 409):', conflictRes.status, 'Conflict Message:', conflictRes.body?.message || conflictRes.body?.error?.message);

  console.log('=== 8. BOOKING CANCELLATION ===');
  if (bookRes.body?.data?.bookingId) {
    const cancelRes = await request('/api/v1/bookings/' + bookRes.body.data.bookingId + '/cancel', 'POST');
    console.log('Status:', cancelRes.status, 'Cancelled State:', cancelRes.body?.data?.status);
  }

  console.log('=== 9. RE-TEST AVAILABILITY AFTER CANCELLATION ===');
  const reAvailRes = await request('/api/v1/resources/available?labId=lab-d01');
  const freedSlot = reAvailRes.body?.data?.resources?.find(r => r.resourceId === 'res-bat0005-1');
  console.log('Freed workstation available:', freedSlot?.available);

  console.log('=== 10. LAB MAINTENANCE TOGGLE ===');
  const maintRes = await request('/api/v1/labs/lab-d01/maintenance', 'POST', {
    enabled: true,
    reason: 'Laser optics calibration and workstation maintenance'
  });
  console.log('Status:', maintRes.status, 'Lab State:', maintRes.body?.data?.operationalStatus, 'Reason:', maintRes.body?.data?.maintenanceStatus);

  console.log('=== 11. BOOKING REJECTED UNDER MAINTENANCE ===');
  const maintBookRes = await request('/api/v1/bookings', 'POST', {
    labId: 'lab-d01',
    resourceId: 'res-bat0005-1',
    startTime: '2026-10-10T14:00:00.000Z',
    endTime: '2026-10-10T16:00:00.000Z'
  });
  console.log('Status (Should be 400):', maintBookRes.status, 'Maintenance Message:', maintBookRes.body?.message);

  console.log('=== 12. RELEASE LAB FROM MAINTENANCE ===');
  const releaseRes = await request('/api/v1/labs/lab-d01/maintenance', 'POST', {
    enabled: false
  });
  console.log('Status:', releaseRes.status, 'Lab State Restored:', releaseRes.body?.data?.operationalStatus);

  console.log('=== 13. AUTH LOGIN (STUDENT & ADMIN) ===');
  const studentLoginRes = await request('/api/v1/auth/login', 'POST', {
    email: 'student@ritindia.edu',
    password: 'password123'
  }, null);
  console.log('Student Login Status:', studentLoginRes.status, 'Role:', studentLoginRes.body?.data?.user?.role);

  const adminLoginRes = await request('/api/v1/auth/login', 'POST', {
    email: 'admin@ritindia.edu',
    password: 'password123'
  }, null);
  console.log('Admin Login Status:', adminLoginRes.status, 'Role:', adminLoginRes.body?.data?.user?.role);

  console.log('=== 14. AUTH REGISTRATION ===');
  const regRes = await request('/api/v1/auth/register', 'POST', {
    name: 'Tejas Shinde',
    email: `tejas.${Date.now()}@ritindia.edu`,
    password: 'securepassword123',
    department: 'Computer Science'
  }, null);
  console.log('Registration Status:', regRes.status, 'Registered Name:', regRes.body?.data?.user?.name);

  console.log('=== 15. AUTH ME (SESSION CHECK) ===');
  const meRes = await request('/api/v1/auth/me', 'GET', null, studentLoginRes.body?.data?.token);
  console.log('Auth Me Status:', meRes.status, 'User Name:', meRes.body?.data?.name, 'Role:', meRes.body?.data?.role);

  console.log('=== 16. MONITORING OVERVIEW ===');
  const monRes = await request('/api/v1/monitoring/overview');
  console.log('Monitoring Status:', monRes.status, 'Total Labs:', monRes.body?.data?.totalLabs, 'Available Labs:', monRes.body?.data?.availableLabs);

  console.log('=== 17. REPORTS DASHBOARD ===');
  const repRes = await request('/api/v1/reports/dashboard');
  console.log('Reports Status:', repRes.status, 'Total Bookings Tracked:', repRes.body?.data?.summary?.totalBookings, 'Avg Utilization:', repRes.body?.data?.summary?.averageUtilization + '%');

  console.log('=== 18. MAINTENANCE WORK ORDERS ===');
  const maintListRes = await request('/api/v1/maintenance');
  console.log('Maintenance List Status:', maintListRes.status, 'Work Orders Count:', maintListRes.body?.data?.length);

  console.log('=== 19. PROTECTED ENDPOINTS WITHOUT AUTH (EXPECT 401) ===');
  const noAuthOverview = await request('/api/v1/monitoring/overview', 'GET', null, null);
  const noAuthReports = await request('/api/v1/reports/dashboard', 'GET', null, null);
  const noAuthMyBookings = await request('/api/v1/bookings/my', 'GET', null, null);
  console.log('Overview No-Auth (401):', noAuthOverview.status, 'Reports No-Auth (401):', noAuthReports.status, 'MyBookings No-Auth (401):', noAuthMyBookings.status);
  if (noAuthOverview.status !== 401 || noAuthReports.status !== 401 || noAuthMyBookings.status !== 401) {
    throw new Error('FAILED: Protected endpoint was accessible without authentication');
  }

  console.log('=== 20. RBAC PRESERVATION: STUDENT FORBIDDEN FROM ADMIN ACTION (EXPECT 403) ===');
  const studentToken = studentLoginRes.body?.data?.token;
  const studentMaintAttempt = await request('/api/v1/labs/lab-d01/maintenance', 'POST', { enabled: true }, studentToken);
  console.log('Student Maintenance Toggle (403):', studentMaintAttempt.status);
  if (studentMaintAttempt.status !== 403) {
    throw new Error('FAILED: Student was able to perform admin maintenance action');
  }

  console.log('=== 21. RESOURCES AVAILABILITY MISSING PARAMETER (EXPECT 400) ===');
  const missingParamRes = await request('/api/v1/resources/available', 'GET', null, null);
  console.log('Missing labId Status (400):', missingParamRes.status, 'Error Code:', missingParamRes.body?.errors?.[0] || missingParamRes.body?.error?.code);
  if (missingParamRes.status !== 400) {
    throw new Error('FAILED: /resources/available without labId did not return 400');
  }

  console.log('=== 22. STUDENT BOOKING RETRIEVAL & MAPPING (/bookings/my) ===');
  const nowIso = new Date().toISOString();
  const laterIso = new Date(Date.now() + 2 * 3600000).toISOString();
  const studentNewBooking = await request('/api/v1/bookings', 'POST', {
    resourceId: 'res-bat0006-1',
    labId: 'lab-d01',
    startTime: nowIso,
    endTime: laterIso,
    purpose: 'Student AI GPU model benchmarking session'
  }, studentToken);
  console.log('Student Booking Created (201):', studentNewBooking.status, 'Booking ID:', studentNewBooking.body?.data?.bookingId);

  const studentMyList = await request('/api/v1/bookings/my', 'GET', null, studentToken);
  console.log('My Bookings Count:', studentMyList.body?.data?.bookings?.length);
  const foundBooking = studentMyList.body?.data?.bookings?.find(b => b.bookingId === studentNewBooking.body?.data?.bookingId);
  console.log('Found Booking Lab Name:', foundBooking?.labName, 'Status:', foundBooking?.status);
  if (!foundBooking || !foundBooking.labName) {
    throw new Error('FAILED: Created student booking not retrieved with labName in /bookings/my');
  }

  console.log('=== 23. REAL OCCUPANCY METRIC CALCULATION (WITHOUT GUESSING BY CAPACITY) ===');
  const operationalLabsRes = await request('/api/v1/labs');
  const d01Lab = operationalLabsRes.body?.data?.find(l => l.id === 'lab-d01' || l.labId === 'D-01');
  console.log('Lab D-01 Operational Status with Active Session:', d01Lab?.operationalStatus);
  if (d01Lab?.operationalStatus !== 'occupied') {
    throw new Error('FAILED: Lab D-01 with active session was not marked as occupied');
  }

  console.log('=== 24. CLEANUP STUDENT TEST BOOKING ===');
  const cleanupRes = await request(`/api/v1/bookings/${studentNewBooking.body.data.bookingId}/cancel`, 'POST', null, studentToken);
  console.log('Cleanup Cancelled Status:', cleanupRes.status, 'State:', cleanupRes.body?.data?.status);
}

run().catch(console.error);
