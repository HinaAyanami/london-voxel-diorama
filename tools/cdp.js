// Minimal CDP driver: node cdp.js <url> <out.png> [waitMs] [port]
const fs = require('fs');
const http = require('http');

const URL_ARG = process.argv[2];
const OUT = process.argv[3];
const WAIT = parseInt(process.argv[4] || '6000', 10);
const PORT = parseInt(process.argv[5] || '9333', 10);

function get(path, method) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path, method: method || 'GET' }, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(data); } });
    });
    req.on('error', reject);
    req.setTimeout(4000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

(async () => {
  let list = [];
  for (let i = 0; i < 40; i++) {
    try { list = await get('/json/list'); if (Array.isArray(list) && list.length) break; } catch (e) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  let target = list.find((t) => t.type === 'page');
  if (!target) { console.error('no page target', list); process.exit(2); }
  let ws;
  for (let attempt = 0; attempt < 3; attempt++) {
    ws = new WebSocket(target.webSocketDebuggerUrl);
    try { await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); break; } catch (e) { ws = null; await new Promise((r) => setTimeout(r, 400)); }
  }
  if (!ws) { console.error('cannot connect'); process.exit(3); }

  let id = 0;
  const pending = new Map();
  const logs = [];
  const exceptions = [];
  const send = (method, params) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.rej(new Error(JSON.stringify(msg.error))); else p.res(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value !== undefined ? a.value : (a.description || a.type)).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : msg.params.exceptionDetails.text);
    } else if (msg.method === 'Log.entryAdded') {
      if (msg.params.entry.level === 'error' || msg.params.entry.level === 'warning') logs.push('log:' + msg.params.entry.level + ': ' + msg.params.entry.text);
    } else if (msg.method === 'Page.loadEventFired') {
      loaded = true;
    }
  };
  let loaded = false;
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL_ARG });
  const t0 = Date.now();
  while (!loaded && Date.now() - t0 < 120000) await new Promise((r) => setTimeout(r, 150));
  await new Promise((r) => setTimeout(r, WAIT));
  if (process.env.CDP_EVAL) {
    try {
      const r = await send('Runtime.evaluate', { expression: process.env.CDP_EVAL, returnByValue: true, awaitPromise: true });
      console.log('EVAL:', JSON.stringify(r.result && r.result.value !== undefined ? r.result.value : r, null, 2));
      await new Promise((r2) => setTimeout(r2, 2300));
    } catch (e) { console.log('EVALERR', String(e)); }
  }
  let probe = null;
  try {
    const r = await send('Runtime.evaluate', {
      expression: `(() => ({diag: window.__diag || null, errs: window.__ERRS || [], title: document.title,
        canvas: (() => { const c = document.getElementById('scene'); return c ? {w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight} : null; })(),
        info: (typeof renderer !== 'undefined') ? {calls: renderer.info.render.calls, tris: renderer.info.render.triangles, cam: camera.position.toArray().map(v => +v.toFixed(2)), kids: scene.children.length} : null
      }))()`,
      returnByValue: true
    });
    probe = r.result.value;
  } catch (e) { probe = { evalError: String(e) }; }
  if (OUT) {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  }
  console.log(JSON.stringify({ probe, exceptions: exceptions.slice(0, 12), logs: logs.slice(-30) }, null, 2));
  ws.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
