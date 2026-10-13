// Run against isolated local servers. All auth/inventory/booking data is a
// browser fixture; only routing and health requests reach the real local API.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_APP_URL || 'http://127.0.0.1:4175';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Use a local test server');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const calls = [];
let failCompute = false;
let delayNext = false;
const user = { id: 'fixture-user', name: 'Routing Test', email: 'routing-test@example.test', role: 'student' };
const labs = Array.from({ length: 12 }, (_, i) => ({ id: `fixture-lab-${i + 1}`, lab_code: `D-${String(i + 1).padStart(2, '0')}`, lab_name: `CSE Lab ${i + 1}`, capacity: 20 }));
const booking = { id: 'fixture-booking', lab_id: 'fixture-lab-10', start_at: '2026-10-20T10:00:00Z', end_at: '2026-10-20T11:00:00Z', state: 'CONFIRMED', purpose: 'Local integration test' };
await page.route('**/api/v1/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Do not access a production API');
  const path = url.pathname.replace('/api/v1', '');
  calls.push({ path, body: request.postDataJSON() });
  if (path.startsWith('/routes/') || path === '/health') {
    if (path === '/routes/compute' && failCompute) {
      return route.fulfill({ status: 503, json: { success: false, message: 'Routing temporarily unavailable (test)' } });
    }
    if (path === '/routes/compute' && delayNext) {
      delayNext = false;
      const response = await route.fetch();
      await new Promise(resolve => setTimeout(resolve, 600));
      return route.fulfill({ response });
    }
    return route.continue();
  }
  let data;
  if (path === '/auth/login') data = { token: 'fixture-token-not-valid-for-any-server', user };
  else if (path === '/auth/me') data = user;
  else if (path === '/labs' || path === '/inventory/labs') data = labs;
  else if (path.startsWith('/inventory/labs/')) data = labs.find(l => l.id === path.split('/').at(-1));
  else if (path === '/bookings/my' || path === '/bookings') data = [booking];
  else if (path === '/bookings/fixture-booking') data = booking;
  else if (path === '/notifications' || path === '/monitoring/alerts' || path === '/inventory/equipment') data = [];
  else return route.fulfill({ status: 404, json: { success: false, message: `Endpoint unavailable: ${path}` } });
  return route.fulfill({ json: { success: true, data } });
});
async function waitForRoute(distance) {
  await page.getByText(`${distance} m`, { exact: true }).waitFor();
  assert.equal(await page.locator('svg[viewBox="0 0 1150 780"] polyline').count(), 3, 'Route is drawn by existing map renderer');
  assert.equal(await page.getByRole('button', { name: 'Start Live Navigation' }).isEnabled(), true);
}
try {
  await page.goto(`${origin}/student/route?destination=D-01`);
  await page.getByPlaceholder('e.g. 2553018@ritindia.edu or student').fill(user.email);
  await page.getByPlaceholder('••••••••').fill('fixture-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/student/route?destination=D-01');
  await waitForRoute(37);
  assert.deepEqual(await page.getByLabel('Routing algorithm').locator('option').allTextContents(), ['DIJKSTRA', 'BFS', 'DFS', 'BELLMAN-FORD']);
  const expectedPoints = '245,360 350,360 465,230 405,135';
  assert.equal(await page.locator('svg[viewBox="0 0 1150 780"] polyline').first().getAttribute('points'), expectedPoints);
  for (const algorithm of ['dfs', 'bfs', 'bellman-ford', 'dijkstra']) {
    if (algorithm === 'dijkstra') {
      // React Query may reuse the just-verified result for this exact key.
      await page.getByLabel('Routing algorithm').selectOption(algorithm);
    } else {
      await Promise.all([
        page.waitForResponse(r => r.url().endsWith('/routes/compute') && r.request().postDataJSON().algorithm === algorithm),
        page.getByLabel('Routing algorithm').selectOption(algorithm),
      ]);
    }
    await waitForRoute(algorithm === 'dfs' ? 52 : 37);
    if (['dfs', 'bfs'].includes(algorithm)) assert.equal(await page.getByText('Calculated Optimal Route', { exact: true }).count(), 0);
  }
  console.log('PASS: login redirect preserves destination; actual API route geometry, meters and all four algorithms');
  await page.screenshot({ path: '/tmp/lab-sync-route-desktop.png', fullPage: true });

  // An old response must not replace a more recent selection.
  delayNext = true;
  await page.getByText('D-02 — Database Lab', { exact: true }).click();
  await page.getByText('D-03 — Project Lab', { exact: true }).click();
  await waitForRoute(39);
  await page.waitForTimeout(750);
  await waitForRoute(39);

  failCompute = true;
  await page.getByRole('button', { name: 'Recalculate Route' }).click();
  await page.getByText('Routing temporarily unavailable (test)', { exact: true }).waitFor();
  assert.equal(await page.locator('svg[viewBox="0 0 1150 780"] polyline').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Start Live Navigation' }).isDisabled(), true);
  failCompute = false;
  await page.getByRole('button', { name: 'Recalculate Route' }).click();
  await waitForRoute(39);
  console.log('PASS: selection race, server error clears route, retry recovers');

  await page.goto(`${origin}/student/route?destination=node_turing`);
  await page.getByText('This destination is not mapped to a CSE lab. Select the correct lab from the list.', { exact: true }).waitFor();
  assert.equal(await page.locator('svg[viewBox="0 0 1150 780"] polyline').count(), 0);
  await page.goto(`${origin}/student/route?labId=fixture-lab-10`);
  await waitForRoute(54);
  await page.goto(`${origin}/student/route/fixture-booking`);
  await waitForRoute(54);
  assert.ok(calls.some(c => c.path === '/routes/compute' && c.body.toNodeId === 'node_d10'));
  console.log('PASS: lab UUID and booking navigation resolve D-10; unknown legacy IDs show error');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300); // allow the existing responsive sidebar transition
  await page.screenshot({ path: '/tmp/lab-sync-route-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No mobile horizontal overflow');
  await page.goto(`${origin}/student/dashboard`);
  await page.getByRole('heading', { name: /Good|Welcome|Dashboard/i }).first().waitFor();
  await page.goto(`${origin}/student/labs`);
  await page.getByText('CSE Lab 1', { exact: true }).first().waitFor();
  await page.goto(`${origin}/student/labs/fixture-lab-10`);
  await page.getByRole('button', { name: 'View Route', exact: true }).click();
  await page.waitForURL('**/student/route?labId=fixture-lab-10');
  await waitForRoute(54);
  await page.goto(`${origin}/student/bookings/fixture-booking`);
  await page.getByText('54 m (0.05 km)', { exact: true }).first().waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: mobile layout, dashboard, lab list and booking details mount without runtime errors');
} finally { await browser.close(); }
