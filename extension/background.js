/* The API contract is taken from the school's public frontend source. */
importScripts('core.js');
const API = 'http://140.124.181.95:30200/api';
const PROFILE = 'http://140.124.181.95:30100/profile';
const active = new Set();
async function request(url, body, token) {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000), redirect: 'error', cache: 'no-store'
  });
  if (!response.ok) throw new Error(`學校網站回應 HTTP ${response.status}，請確認登入與校內網路`);
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { throw new Error('學校網站回應格式無法辨識'); }
}
async function identity(msg) {
  if (!msg.token || !msg.userID) throw new Error('請先登入 Time Log，再重新開啟快填');
  const profile = await request(PROFILE, undefined, msg.token);
  if (String(profile?.userId) !== String(msg.userID)) throw new Error('登入帳號已改變，請重新整理網站');
  return profile;
}
async function options(msg, profile) {
  const data = await request(API + '/belong', { username: profile.username });
  if (!Array.isArray(data?.teamList)) throw new Error('無法取得組別');
  const teams = data.teamList;
  if (!teams.length) return { teams: [], units: [] };
  const activities = await request(API + '/activity/all', { unitIdList: teams.map(t => t.teamID) });
  if (!Array.isArray(activities?.unitDTOList)) throw new Error('無法取得活動類型');
  return { teams, units: activities.unitDTOList };
}
async function history(msg) {
  if (!AutoLogCore.validDate(msg.week) || AutoLogCore.monday(msg.week) !== msg.week) throw new Error('週次無效');
  // Include the previous day so overnight logs crossing Monday are considered.
  const data = await request(API + '/log/history', { userID: msg.userID, startDate: AutoLogCore.addDays(msg.week, -1).replaceAll('-', '/'), endDate: AutoLogCore.addDays(msg.week, 6).replaceAll('-', '/') });
  if (!Array.isArray(data?.logItemList)) throw new Error('無法取得歷史紀錄，已停止送出');
  return data.logItemList;
}
async function handle(msg) {
  const profile = await identity(msg);
  if (msg.op === 'options') return options(msg, profile);
  if (msg.op === 'history') return history(msg);
  if (msg.op !== 'submit') throw new Error('不支援的操作');
  const key = String(msg.userID);
  if (active.has(key)) throw new Error('另一個視窗正在送出，請稍後重新檢查');
  active.add(key);
  try {
    const { teams, units } = await options(msg, profile);
    const settings = msg.settings;
    const team = teams.find(t => String(t.teamID) === String(settings?.teamID));
    const unit = units.find(t => String(t.unitID) === String(team?.teamID));
    if (!settings?.title?.trim() || !team || !unit?.activityTypeList?.some(a => a.name === settings.type && a.enable !== false)) throw new Error('標題、組別或類型無效，請重新選擇');
    if (!Array.isArray(msg.rows) || !msg.rows.length || msg.rows.length > 100) throw new Error('送出時段數量無效');
    const results = [];
    for (const row of msg.rows) {
      try {
        // Fresh server history before every write: safe after partial completion or a retry.
        const existing = await history(msg);
        const checked = AutoLogCore.plan([{ ...row, selected: true }], existing, msg.week)[0];
        if (!checked.ready) { results.push({ id: row.id, status: 'skipped', message: checked.reason }); continue; }
        await request(API + '/log/record', AutoLogCore.payload(row, settings, msg.userID));
        const updated = await history(msg);
        const found = updated.some(h => AutoLogCore.historyStamp(h.startTime) === AutoLogCore.stamp(row.date, row.start) && AutoLogCore.historyStamp(h.endTime) === AutoLogCore.stamp(row.date, row.end) && h.title === settings.title.trim() && h.activityTypeName === settings.type && (String(h.activityUnitID) === String(settings.teamID) || h.teamName === team.teamName));
        if (!found) throw new Error('送出後未能確認紀錄，請到 History 查核再重試');
        results.push({ id: row.id, status: 'success', message: '已送出並確認' });
      } catch (error) {
        results.push({ id: row.id, status: 'unknown', message: `${error.message}。此筆狀態待確認；其餘未送出。` });
        break;
      }
    }
    return { results };
  } finally { active.delete(key); }
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (new URL(sender.url || 'about:blank').origin !== 'http://140.124.181.95:30201') return;
  handle(msg).then(data => reply({ ok: true, data }), error => reply({ ok: false, error: error.message }));
  return true;
});
