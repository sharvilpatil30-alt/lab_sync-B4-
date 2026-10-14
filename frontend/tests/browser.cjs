// Real Chromium interaction tests with intercepted auth/booking fixtures and a live-read catalog.
// No credentials, account writes, or live booking writes. Requires CHROME_BIN and a frontend build.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  { spawn } = require("node:child_process"),
  assert = require("node:assert/strict");
const catalog = JSON.parse(
  fs.readFileSync("/tmp/campus-browser-catalog.json", "utf8"),
);
const results = [];
let chrome, server, ws;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  try {
    const root = path.resolve(__dirname, "../dist");
    server = http.createServer((req, res) => {
      let file = path.join(root, new URL(req.url, "http://local").pathname);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
        file = path.join(root, "index.html");
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html",
      );
      res.end(fs.readFileSync(file));
    });
    server.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync("/tmp/campus-chrome-");
    chrome = spawn(
      process.env.CHROME_BIN ||
        "/home/triquetrus/.cache/puppeteer/chrome-headless-shell/linux-150.0.7871.24/chrome-headless-shell-linux64/chrome-headless-shell",
      [
        "--no-sandbox",
        "--disable-gpu",
        "--remote-debugging-port=0",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let chromeErrors = "";
    chrome.stderr.on("data", (d) => (chromeErrors += d));
    for (
      let i = 0;
      i < 100 && !fs.existsSync(path.join(profile, "DevToolsActivePort"));
      i++
    )
      await sleep(100);
    if (!fs.existsSync(path.join(profile, "DevToolsActivePort")))
      throw new Error("Chromium startup failed: " + chromeErrors.slice(0, 300));
    const port = fs
      .readFileSync(path.join(profile, "DevToolsActivePort"), "utf8")
      .split("\n")[0];
    const pages = await (
      await fetch(`http://127.0.0.1:${port}/json/list`)
    ).json();
    ws = new WebSocket(pages[0].webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    let seq = 0;
    const pending = new Map();
    let role = "student",
      authFailure = false,
      apiFailure = false,
      bookingConflict = false,
      preemptableOnly = false,
      bookings = [],
      submission,
      seatRequest;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const userId = "11111111-1111-4111-8111-111111111111";
    const authUser = () => ({
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "browser-fixture@example.invalid",
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { full_name: "Browser Test", role: "admin" },
      app_metadata: { provider: "email" },
      created_at: new Date().toISOString(),
    });
    const jwt = () =>
      [
        "eyJhbGciOiJIUzI1NiJ9",
        Buffer.from(
          JSON.stringify({
            sub: userId,
            exp: Math.floor(Date.now() / 1000) + 3600,
            role: "authenticated",
          }),
        ).toString("base64url"),
        "fixture",
      ].join(".");
    ws.addEventListener("message", async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p?.reject(new Error(msg.error.message));
        else p?.resolve(msg.result);
        return;
      }
      if (msg.method === "Fetch.requestPaused") {
        const { requestId, request } = msg.params;
        const url = new URL(request.url);
        let status = 200,
          data;
        if (request.method === "OPTIONS") {
          status = 204;
          data = {};
        } else if (url.pathname.includes("/auth/v1/token"))
          data = {
            access_token: jwt(),
            refresh_token: "fixture-only",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user: authUser(),
          };
        else if (url.pathname.includes("/auth/v1/user")) data = authUser();
        else if (url.pathname.includes("/auth/v1/logout")) data = {};
        else if (url.pathname.includes("/api/v1/")) {
          const route = url.pathname.split("/api/v1")[1];
          if (route === "/auth/me") {
            if (authFailure) {
              status = 503;
              data = { success: false, message: "Profile service unavailable" };
            } else
              data = {
                id: userId,
                name: "Browser Test",
                email: "browser-fixture@example.invalid",
                role: role === "lab_admin" ? "admin" : role,
              };
          } else if (route === "/labs") {
            if (apiFailure) {
              status = 503;
              data = {
                success: false,
                message: "Catalog temporarily unavailable",
              };
            } else data = catalog.labs;
          } else if (route.startsWith("/labs/"))
            data =
              catalog.labs.find((l) => l.id === route.split("/").at(-1)) ||
              catalog.labs[0];
          else if (route === "/resources/available") {
            seatRequest = Object.fromEntries(url.searchParams);
            data = {
              resources: catalog.resources
                .filter((r) => r.lab_id === url.searchParams.get("labId"))
                .map((r) => ({
                  resourceId: r.id,
                  id: r.id,
                  labId: r.lab_id,
                  name: r.label,
                  available: !preemptableOnly && r.state !== "MAINTENANCE",
                  preemptable: preemptableOnly,
                })),
            };
          } else if (route === "/resources") data = catalog.resources;
          else if (route === "/bookings" && request.method === "POST") {
            submission = JSON.parse(request.postData);
            if (bookingConflict) {
              status = 409;
              data = { success: false, message: "Scheduling conflict" };
            } else {
              const booking = {
                id: "22222222-2222-4222-8222-222222222222",
                user_id: userId,
                lab_id: submission.labId,
                resource_id: submission.resourceId,
                start_at: submission.startTime,
                end_at: submission.endTime,
                purpose: submission.purpose,
                state: "CONFIRMED",
              };
              bookings.push(booking);
              data = booking;
              status = 201;
            }
          } else if (route.endsWith("/cancel")) {
            bookings[0].state = "CANCELLED";
            data = bookings[0];
          } else if (route === "/bookings" || route === "/bookings/my")
            data = bookings;
          else if (route.startsWith("/bookings/")) data = bookings[0];
          else if (route === "/monitoring/overview")
            data = {
              totalLabs: 12,
              totalResources: 432,
              availableLabs: 12,
              availableResources: 432,
              occupiedLabs: 0,
              maintenanceLabs: 0,
              activeBookings: 0,
              queuedBookings: 0,
              alerts: [],
              lastUpdated: new Date().toISOString(),
            };
          else if (route === "/reports/dashboard") data={labUtilization:[],resourceUtilization:[],bookingTrends:[],summary:{totalBookings:0,averageUtilization:0,peakHour:"No allocated sessions",queueResolutionRate:null}};
          else if (route === "/health") data = { status: "ok" };
          else data = [];
          if (status < 400) data = { success: true, data };
        } else {
          await send("Fetch.continueRequest", { requestId });
          return;
        }
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: status,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
            { name: "Access-Control-Allow-Origin", value: "*" },
            { name: "Access-Control-Allow-Headers", value: "*" },
            {
              name: "Access-Control-Allow-Methods",
              value: "GET,POST,PATCH,OPTIONS",
            },
          ],
          body: Buffer.from(JSON.stringify(data)).toString("base64"),
        });
      }
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    async function waitFor(expression) {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return;
        await sleep(100);
      }
      throw new Error(
        "Timed out: " +
          expression +
          "; page=" +
          (await evaluate("document.body.innerText.slice(0,1000)")),
      );
    }
    async function navigate(route) {
      await send("Page.navigate", { url: base + route });
      await waitFor('document.readyState === "complete"');
    }
    async function click(text) {
      const ok = await evaluate(
        `(()=>{const e=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim().includes(${JSON.stringify(text)}));if(!e||e.disabled)return false;e.click();return true;})()`,
      );
      assert.ok(ok, "Clickable: " + text);
      await sleep(100);
    }
    async function input(selector, value) {
      await evaluate(
        `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('input missing');const set=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
      );
    }
    async function check(name, fn) {
      const start = performance.now();
      try {
        await fn();
        results.push({
          name,
          status: "PASS",
          ms: +(performance.now() - start).toFixed(1),
        });
      } catch (e) {
        results.push({ name, status: "FAIL", error: e.message });
      }
    }
    async function login(as) {
      role = as;
      await navigate("/login");
      await evaluate("localStorage.clear()");
      await navigate("/login");
      await waitFor('!!document.querySelector("input[type=password]")');
      await input(
        "input[type=email],input[name=email],input[type=text]",
        "browser-fixture@example.invalid",
      );
      await input("input[type=password]", "fixture-password");
      await evaluate('document.querySelector("form").requestSubmit()');
    }
    for (const as of ["student", "faculty", "admin", "lab_admin"])
      await check(
        `${as} login redirects using /auth/me role, ignoring editable admin metadata`,
        async () => {
          await login(as);
          await waitFor(
            `location.pathname === '/${as === "lab_admin" ? "admin" : as}/dashboard'`,
          );
        },
      );
    await check("Session reload retains trusted faculty badge; logout clears access", async()=>{
      await login('faculty');await waitFor("location.pathname === '/faculty/dashboard'");
      await navigate('/faculty/profile');await waitFor("document.body.innerText.includes('Priority reservation privileges')");
      await send('Page.reload');await sleep(300);await waitFor("document.body.innerText.includes('Priority reservation privileges')");
      await click('Sign Out');await waitFor("document.body.innerText.includes('Sign Out of Smart Campus?')");
      await click('Confirm Sign Out');await waitFor("location.pathname === '/login'");
      await navigate('/faculty/dashboard');await waitFor("location.pathname === '/login'");
    });
    await check("Backend profile failure prevents login", async () => {
      authFailure = true;
      try {
        await login("student");
        await waitFor(
          "document.body.innerText.includes('Profile service unavailable')",
        );
        assert.equal(await evaluate("location.pathname"), "/login");
      } finally {
        authFailure = false;
      }
    });
    await check(
      "Student lab search renders all 12 live-read labs",
      async () => {
        await login("student");
        await waitFor("location.pathname === '/student/dashboard'");
        await navigate("/student/labs");
        await waitFor("document.body.innerText.includes('D-12')");
        for (const l of catalog.labs)
          assert.ok(
            await evaluate(
              `document.body.innerText.includes(${JSON.stringify(l.lab_code)})`,
            ),
          );
      },
    );
    await check(
      "Student cannot open admin dashboard by changing URL",
      async () => {
        await navigate("/admin/dashboard");
        await waitFor("location.pathname === '/unauthorized'");
      },
    );
    await check("Past date prevents wizard progression", async () => {
      await navigate("/student/bookings/create");
      await waitFor("document.body.innerText.includes('Next: Select Date')");
      await click("Next: Select Date");
      await input("input[type=date]", "2020-01-01");
      await click("Next: Select Seat");
      await waitFor(
        "document.body.innerText.includes('Choose a future start time')",
      );
      assert.equal(
        await evaluate("!!document.querySelector('button[aria-pressed]')"),
        false,
      );
    });
    await check(
      "Wizard six steps, selected state, payload and booking detail",
      async () => {
        await navigate("/student/bookings/create");
        await waitFor("document.body.innerText.includes('Next: Select Date')");
        await click("Next: Select Date");
        await input("input[type=date]", "2027-01-20");
        await input("input[type=time]", "10:00");
        await click("Next: Select Seat");
        await waitFor(
          "document.body.innerText.includes('Workstation') && !!document.querySelector('button[aria-pressed]')",
        );
        assert.equal(
          await evaluate(
            "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Next: Enter Purpose')).disabled",
          ),
          true,
        );
        await evaluate(
          "document.querySelector('button[aria-pressed]:not(:disabled)').click()",
        );
        await waitFor("!!document.querySelector('button[aria-pressed=true]')");
        await click("Next: Enter Purpose");
        await input("textarea", "Browser integration verification purpose");
        await click("Next: Review Booking");
        await click("Confirm & Book Workstation");
        await waitFor("location.pathname.includes('/bookings/22222222')");
        assert.ok(
          catalog.resources.some((r) => r.id === submission.resourceId),
        );
        assert.equal(submission.startTime, "2027-01-20T04:30:00.000Z");
        assert.equal(
          submission.purpose,
          "Browser integration verification purpose",
        );
      },
    );
    await check(
      "My Bookings displays persisted-response fixture and cancellation",
      async () => {
        await navigate("/student/bookings");
        await waitFor(
          "document.body.innerText.includes('Browser integration verification purpose')",
        );
        await evaluate(
          "document.querySelector('button[title=\"Cancel Booking\"]').click()",
        );
        await sleep(200);
        const text = await evaluate("document.body.innerText");
        if (text.includes("Confirm Cancellation"))
          await click("Confirm Cancellation");
        else if (text.includes("Yes, Cancel")) await click("Yes, Cancel");
        await waitFor(
          "document.body.innerText.toUpperCase().includes('CANCELLED')",
        );
        assert.equal(bookings[0].state, "CANCELLED");
      },
    );
    await check(
      "409 conflict gives retry feedback without success navigation",
      async () => {
        bookingConflict = true;
        try {
          await navigate("/student/bookings/create");
          await waitFor(
            "document.body.innerText.includes('Next: Select Date')",
          );
          await click("Next: Select Date");
          await click("Next: Select Seat");
          await waitFor(
            "!!document.querySelector('button[aria-pressed]:not(:disabled)')",
          );
          await evaluate(
            "document.querySelector('button[aria-pressed]:not(:disabled)').click()",
          );
          await click("Next: Enter Purpose");
          await input("textarea", "Conflict browser regression test");
          await click("Next: Review Booking");
          await click("Confirm & Book Workstation");
          await waitFor(
            "document.body.innerText.includes('Booking Submission Failed')",
          );
          assert.ok(
            await evaluate(
              "document.body.innerText.includes('Scheduling Conflict')",
            ),
          );
        } finally {
          bookingConflict = false;
        }
      },
    );
    await check(
      "Faculty priority seats selectable only for trusted faculty role",
      async () => {
        preemptableOnly = true;
        try {
          for (const as of ["student", "faculty"]) {
            await login(as);
            await waitFor(`location.pathname === '/${as}/dashboard'`);
            await navigate(`/${as}/bookings/create`);
            await waitFor(
              "document.body.innerText.includes('Next: Select Date')",
            );
            await click("Next: Select Date");
            await click("Next: Select Seat");
            await waitFor("!!document.querySelector('button[aria-pressed]')");
            assert.equal(
              await evaluate(
                "document.querySelector('button[aria-pressed]').disabled",
              ),
              as === "student",
            );
            if (as === "faculty") {
              await evaluate(
                "document.querySelector('button[aria-pressed]').click()",
              );
              await click("Next: Enter Purpose");
            }
          }
        } finally {
          preemptableOnly = false;
        }
        await login("student");
        await waitFor("location.pathname === '/student/dashboard'");
      },
    );
    await check(
      "Catalog request failure produces retryable error",
      async () => {
        apiFailure = true;
        await navigate("/student/bookings/create");
        await waitFor(
          "document.body.innerText.includes('Laboratories unavailable')",
        );
        apiFailure = false;
      },
    );
    console.log(
      JSON.stringify(
        {
          mode: "Real Chromium with intercepted auth/bookings; catalog read from live DB. Not real credential verification.",
          results,
          pass: results.filter((r) => r.status === "PASS").length,
          fail: results.filter((r) => r.status === "FAIL").length,
        },
        null,
        2,
      ),
    );
    if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    ws?.close();
    chrome?.kill();
    server?.closeAllConnections();
    server?.close();
  }
})();
