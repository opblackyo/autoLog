const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../extension/core.js');
const week = '2026-10-19', now = Date.parse('2026-10-26T00:00:00+08:00');
test('fixed schedule has six periods and exactly ten hours, with noon as 12:00', () => {
  const rows = C.expand(C.defaults, week, now);
  assert.equal(rows.length, 6);
  assert.equal(rows.reduce((sum, r) => sum + C.minutes(r.end) - C.minutes(r.start), 0), 600);
  assert.equal(rows[0].date, '2026-10-20');
  assert.equal(C.payload(rows[0], { title: ' MOB ', type: 'LabProject', teamID: 5 }, 'u').endTime, '2026/10/20 12:00');
  assert.equal(C.stamp('2026-10-20', '12:00') - C.stamp('2026-10-20', '10:00'), 7200000);
});
test('week calculations handle Sunday, year boundary and Taipei timezone', () => {
  assert.equal(C.monday('2026-10-25'), week);
  assert.equal(C.addDays('2026-12-28', 6), '2027-01-03');
  assert.equal(C.today(new Date('2026-10-21T17:00:00Z')), '2026-10-22');
});
test('today can be selected before the shift starts or ends, but tomorrow is blocked', () => {
  const time = Date.parse('2026-10-20T08:00:00+08:00');
  const rows = C.expand(C.defaults, week, time);
  assert.deepEqual(rows.map(r => r.selected), [true, true, false, false, false, false]);
  assert.equal(C.validate(rows[0], week, time), '');
  assert.equal(C.validate(rows[0], week, Date.parse('2026-10-20T11:00:00+08:00')), '');
  assert.equal(C.plan([{ ...rows[1], selected: true }], [], week, time)[0].ready, true);
  assert.equal(C.plan([{ ...rows[2], selected: true }], [], week, time)[0].reason, '明天以後的時段不可填寫');
});
test('date eligibility switches at Taipei midnight regardless of the host timezone', () => {
  const row = { date: '2026-10-22', start: '22:00', end: '23:59', selected: true };
  assert.equal(C.validate(row, week, Date.parse('2026-10-21T15:59:59Z')), '明天以後的時段不可填寫');
  assert.equal(C.validate(row, week, Date.parse('2026-10-21T16:00:00Z')), '');
  assert.equal(C.validate(row, week, Date.parse('2026-10-22T16:00:00Z')), '');
});
test('leave exclusion, duplicates, overlaps and adjacent periods', () => {
  const rows = C.expand(C.defaults, week, now);
  rows[1].selected = false;
  const history = [{ startTime: '2026/10/20 10:00', endTime: '2026/10/20 12:00' }, { startTime: '2026-10-21T06:30:00Z', endTime: '2026-10-21T07:30:00Z' }];
  const plan = C.plan(rows, history, week, now);
  assert.equal(plan.length, 5);
  assert.equal(plan[0].reason, '已有相同時段');
  assert.equal(plan[1].reason, '與現有紀錄重疊');
  assert.equal(plan.filter(r => r.ready).length, 3);
  assert.equal(C.plan([{ ...rows[1], selected: true }], [{ startTime: '2026/10/20 12:00', endTime: '2026/10/20 13:00' }], week, now)[0].ready, true);
  assert.equal(C.plan([rows[0], { ...rows[0], id: 'other' }], [], week, now)[1].ready, false);
});
test('reject malformed history, invalid dates, backwards times and invalid templates', () => {
  const row = C.expand(C.defaults, week, now)[0];
  assert.throws(() => C.plan([row], [{ startTime: 'unknown', endTime: '' }], week, now));
  assert.equal(C.validDate('2026-02-30'), false);
  assert.ok(C.validate({ ...row, end: '09:00' }, week, now));
  assert.ok(C.validate({ ...row, date: '2026-10-26' }, week, now));
  assert.throws(() => C.template([{ day: 2, start: '10:00', end: 'broken' }]));
});
