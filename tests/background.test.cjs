const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../extension/core.js');
function setup(mode) {
  let listener, writes = 0; const logs = [];
  const sandbox = { AutoLogCore: C, importScripts() {}, URL, AbortSignal, Set,
    chrome: { runtime: { onMessage: { addListener(fn) { listener = fn; } } } },
    async fetch(url, init) {
      const body = init.body && JSON.parse(init.body);
      let data;
      if (url.endsWith('/profile')) data = { userId: mode === 'wrong-user' ? 'another' : 'u', username: 'user' };
      else if (url.endsWith('/belong')) data = { teamList: [{ teamID: 't', teamName: 'CrossFunctionalFrontEnd' }] };
      else if (url.endsWith('/activity/all')) data = { unitDTOList: [{ unitID: 't', activityTypeList: [{ name: 'LabProject' }] }] };
      else if (url.endsWith('/log/history')) data = { logItemList: logs };
      else if (url.endsWith('/log/record')) {
        writes++;
        logs.push({ ...body, teamName: 'CrossFunctionalFrontEnd' });
        if (mode === 'uncertain' && writes === 1) throw new Error('connection lost after write');
        data = {};
      } else throw new Error('Unexpected endpoint');
      return { ok: true, text: async () => JSON.stringify(data) };
    }
  };
  vm.runInNewContext(fs.readFileSync('extension/background.js', 'utf8'), sandbox);
  return { writes: () => writes, send: msg => new Promise(resolve => listener(msg, { url: 'http://140.124.181.95:30201/' }, resolve)) };
}
const message = { op: 'submit', userID: 'u', token: 'test-only', week: '2020-10-19', settings: { title: 'MOB', type: 'LabProject', teamID: 't' }, rows: C.expand(C.defaults, '2020-10-19') };
test('successful bulk write verifies each item, and retry skips existing records', async () => {
  const app = setup();
  const first = await app.send(message);
  assert.equal(first.ok, true); assert.equal(first.data.results.filter(r => r.status === 'success').length, 6);
  const second = await app.send(message);
  assert.equal(second.data.results.filter(r => r.status === 'skipped').length, 6);
  assert.equal(app.writes(), 6);
});
test('unknown response stops batch; retry checks history before writing again', async () => {
  const app = setup('uncertain');
  const first = await app.send(message);
  assert.equal(first.data.results.length, 1); assert.equal(first.data.results[0].status, 'unknown');
  assert.equal(app.writes(), 1);
  const second = await app.send(message);
  assert.equal(second.data.results[0].status, 'skipped'); assert.equal(app.writes(), 6);
});
test('profile mismatch fails before any write', async () => {
  const app = setup('wrong-user'); const result = await app.send(message);
  assert.equal(result.ok, false); assert.equal(app.writes(), 0);
});
