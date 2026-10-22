(function (root) {
  'use strict';
  const defaults = [
    { day: 2, start: '10:00', end: '12:00' },
    { day: 2, start: '13:00', end: '14:00' },
    { day: 3, start: '14:00', end: '15:00' },
    { day: 4, start: '10:00', end: '12:00' },
    { day: 4, start: '13:00', end: '15:00' },
    { day: 5, start: '13:00', end: '15:00' }
  ];
  const pad = n => String(n).padStart(2, '0');
  function today(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00Z');
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === value;
  }
  function addDays(value, count) {
    if (!validDate(value)) throw new Error('日期無效');
    const d = new Date(value + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + count);
    return d.toISOString().slice(0, 10);
  }
  function monday(value) {
    const day = new Date(value + 'T00:00:00Z').getUTCDay();
    return addDays(value, -((day + 6) % 7));
  }
  function minutes(value) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  }
  function stamp(date, time) { return Date.parse(`${date}T${time}:00+08:00`); }
  function historyStamp(value) {
    if (typeof value !== 'string') return NaN;
    const v = value.trim().replaceAll('/', '-').replace(' ', 'T');
    return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(v) ? v : v + '+08:00');
  }
  function validate(row, week, now = Date.now()) {
    if (!validDate(row.date) || row.date < week || row.date > addDays(week, 6)) return '日期須在選擇的週次內';
    if (!Number.isFinite(minutes(row.start)) || !Number.isFinite(minutes(row.end))) return '請填完整的時間';
    if (minutes(row.end) <= minutes(row.start)) return '結束時間須晚於開始時間';
    if (row.date > today(new Date(now))) return '明天以後的時段不可填寫';
    return '';
  }
  function expand(slots, week, now = Date.now()) {
    return slots.map((slot, i) => {
      const row = { id: String(i), date: addDays(week, (slot.day + 6) % 7), start: slot.start, end: slot.end };
      return { ...row, selected: !validate(row, week, now), result: '' };
    });
  }
  function plan(rows, history, week, now = Date.now()) {
    if (!Array.isArray(history) || history.some(h => !Number.isFinite(historyStamp(h.startTime)) || !Number.isFinite(historyStamp(h.endTime)))) throw new Error('歷史紀錄格式無法辨識，已停止送出');
    const accepted = [];
    return rows.filter(r => r.selected).map(row => {
      let reason = validate(row, week, now);
      const a = stamp(row.date, row.start), b = stamp(row.date, row.end);
      if (!reason && history.some(h => a === historyStamp(h.startTime) && b === historyStamp(h.endTime))) reason = '已有相同時段';
      if (!reason && history.some(h => a < historyStamp(h.endTime) && b > historyStamp(h.startTime))) reason = '與現有紀錄重疊';
      if (!reason && accepted.some(r => a < stamp(r.date, r.end) && b > stamp(r.date, r.start))) reason = '與本次其他時段重疊';
      if (!reason) accepted.push(row);
      return { ...row, reason, ready: !reason };
    });
  }
  function payload(row, settings, userID) {
    return { userID, title: settings.title.trim(), activityTypeName: settings.type,
      startTime: `${row.date.replaceAll('-', '/')} ${row.start}`, endTime: `${row.date.replaceAll('-', '/')} ${row.end}`,
      description: settings.description || '', activityUnitID: settings.teamID };
  }
  function template(slots) {
    if (!Array.isArray(slots) || !slots.length || slots.length > 100 || slots.some(s => !Number.isInteger(s.day) || s.day < 0 || s.day > 6 || !Number.isFinite(minutes(s.start)) || minutes(s.end) <= minutes(s.start) || !Number.isFinite(minutes(s.end)))) throw new Error('範本時段無效');
    return slots.map(({ day, start, end }) => ({ day, start, end }));
  }
  const api = { defaults, pad, today, validDate, addDays, monday, minutes, stamp, historyStamp, validate, expand, plan, payload, template };
  if (typeof module !== 'undefined') module.exports = api;
  root.AutoLogCore = api;
})(globalThis);
