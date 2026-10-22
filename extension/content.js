(() => {
  'use strict';
  const demo = location.hostname === 'localhost' && globalThis.AutoLogDemo;
  if (!demo && location.origin !== 'http://140.124.181.95:30201') return;
  if (document.getElementById('autolog-helper')) return;
  const C = AutoLogCore;
  const host = document.createElement('div');
  host.id = 'autolog-helper';
  const root = host.attachShadow({ mode: 'open' });
  document.documentElement.append(host);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => demo ? 'demo-user' : localStorage.getItem('uid');
  const namespace = () => `autolog.v1.${uid() || 'guest'}`;
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(`${namespace()}.${key}`)) ?? fallback; } catch { return fallback; } }
  let storageWarning = '';
  function write(key, value) { try { localStorage.setItem(`${namespace()}.${key}`, JSON.stringify(value)); } catch { storageWarning = '瀏覽器無法儲存設定，關閉後可能遺失。'; } }
  let week = C.monday(C.today()), rows = [], teams = [], units = [], review = null, busy = false, message = '', loaded = false;
  let owner = uid();
  let settings = read('settings', { title: 'MOB', teamID: '', type: 'LabProject', description: '' });
  let templates = read('templates', {});
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) templates = {};
  function loadWeek() { const draft = read(`week.${week}`, null); rows = Array.isArray(draft) ? draft.map(r => ({ ...r, result: '' })) : C.expand(C.defaults, week); }
  loadWeek();
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial;font-family:"Microsoft JhengHei","Segoe UI",sans-serif;color:#23383e;font-size:15px;line-height:1.5}
    *{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default;opacity:.5}
    button,input,select{border:1px solid #bbcdd2;border-radius:6px;padding:9px 12px;background:white;color:#23383e}
    button:hover:not(:disabled){background:#e6f4f5}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #0797a8;outline-offset:2px}
    .launch{position:fixed;right:26px;bottom:26px;z-index:2147483646;background:#087c89;color:white;border:0;box-shadow:0 4px 20px #183c4540;padding:14px 22px;font-weight:700}
    dialog{border:0;border-radius:14px;padding:0;width:min(1040px,calc(100vw - 32px));max-height:90vh;color:inherit;background:#f3f8fa;box-shadow:0 20px 100px #17353d55}
    dialog[open]{display:flex;flex-direction:column}dialog::backdrop{background:#162d3a80}header{padding:25px 30px 20px;background:white;border-bottom:1px solid #d7e3e7;display:flex;justify-content:space-between;gap:20px;align-items:start;flex-shrink:0}
    h1{font-size:25px;margin:0 0 4px;font-weight:750}h2{font-size:19px;margin:0 0 10px}p{margin:0}.sub,.hint{color:#526d77;font-size:13px}.x{font-size:22px;line-height:1;padding:8px 12px;border:0}
    main{padding:22px 30px;display:grid;gap:18px;overflow:auto;min-height:0}.week{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.week strong{font-size:18px;margin-right:auto}.week input{max-width:155px}
    .settings{display:grid;grid-template-columns:1fr 2fr 1.2fr;gap:12px}label.field{display:grid;gap:5px;font-size:13px;color:#526d77}.field input,.field select{min-width:0;width:100%;color:#23383e}.description{grid-column:1/-1}
    .toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.toolbar button,.toolbar select{padding:7px 10px;font-size:13px}.toolbar .spacer{flex:1}.sheet{background:white;border:1px solid #d7e3e7;border-radius:9px;overflow:auto}
    table{border-collapse:collapse;width:100%;min-width:660px;font-size:14px}th{text-align:left;font-weight:500;font-size:12px;color:#526d77;background:#eaf2f5;padding:10px 12px}td{padding:11px 12px;border-top:1px solid #e3ecef;vertical-align:middle}
    td input[data-field=start],td input[data-field=end]{width:92px;padding:6px;font-variant-numeric:tabular-nums}td input[type=date]{width:142px;padding:6px}input[type=checkbox]{accent-color:#087c89;width:19px;height:19px;cursor:pointer;vertical-align:middle}.day{display:block;font-size:12px;color:#526d77;margin-top:3px}
    tr.off{background:#f8fafb;color:#788991}.state{font-size:12px;color:#526d77;max-width:210px}.state.bad{color:#a34a25}.state.good{color:#087c62}.remove{border:0;padding:4px 9px;background:transparent;color:#526d77}
    .note{padding:11px 14px;background:#e5f2f5;border-left:3px solid #128f9d;font-size:13px;white-space:pre-line;overflow-wrap:anywhere}.note:empty{display:none}.error{border-color:#bb682f;background:#fff3e8;color:#88431e}
    footer{padding:18px 30px 23px;display:flex;justify-content:space-between;align-items:center;gap:14px;background:white;border-top:1px solid #d7e3e7;flex-wrap:wrap;flex-shrink:0}.total{font-size:24px;font-weight:750;color:#087c89}.total small{font-size:13px;font-weight:400;color:#526d77}.primary{background:#087c89;color:white;border-color:#087c89;font-weight:650}.primary:hover:not(:disabled){background:#086774}.actions{display:flex;gap:8px}.review{border:2px solid #128f9d;border-radius:8px;padding:16px;background:white}.review ul{padding-left:22px;margin:10px 0}.review li{margin:6px 0}.review .skip{color:#a34a25}.review p{font-size:13px}.review .actions{margin-top:14px;justify-content:flex-end}.count{margin-left:8px;font-size:13px;color:#526d77}
    .leave{background:#f2f7f9}.template-name{max-width:130px;padding:7px 10px;font-size:13px}
    @media(max-width:720px){header{padding:20px}main{padding:16px}footer{padding:16px 20px}.settings{grid-template-columns:1fr}.description{grid-column:auto}.week strong{width:100%}dialog{width:calc(100vw - 16px);max-height:95vh}.launch{right:14px;bottom:14px}}
  `;
  root.append(style);
  const launch = document.createElement('button'); launch.className = 'launch'; launch.textContent = '▦ 快速填寫';
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', '每週上班時段快速填寫');
  root.append(launch, dialog);
  async function call(op, extra = {}) {
    if (demo) return demo.call(op, { week, rows, settings, ...extra });
    if (uid() !== owner) throw new Error('登入帳號已變更，請重新整理網站');
    const response = await chrome.runtime.sendMessage({ op, userID: uid(), token: localStorage.getItem('access_token'), week, ...extra });
    if (!response?.ok) throw new Error(response?.error || '擴充功能連線失敗，請重新整理網站');
    return response.data;
  }
  function save() { write(`week.${week}`, rows); write('settings', settings); }
  function invalidate() { review = null; save(); }
  function typeList() { return units.find(u => String(u.unitID) === String(settings.teamID))?.activityTypeList?.filter(a => a.enable !== false) || []; }
  const weekday = date => '星期' + '日一二三四五六'[new Date(date + 'T00:00:00Z').getUTCDay()];
  const hours = list => (list.reduce((sum, r) => sum + (C.minutes(r.end) - C.minutes(r.start)), 0) / 60).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  function render() {
    const previousScroll = dialog.querySelector('main')?.scrollTop || 0;
    const selected = rows.filter(r => r.selected && !C.validate(r, week));
    const team = teams.find(t => String(t.teamID) === String(settings.teamID));
    dialog.innerHTML = `<header><div><h1>這週的上班時段</h1><p class="sub">${demo ? '互動示範，所有資料都只在此頁模擬。' : '依實際出勤勾選，請假時段取消即可。'} 時間以台北、24 小時制顯示。</p></div><button class="x" data-action="close" aria-label="關閉" ${busy ? 'disabled' : ''}>×</button></header>
      <main><div class="week"><strong>${esc(week.replaceAll('-', '/'))} — ${esc(C.addDays(week, 6).slice(5).replace('-', '/'))}</strong><button data-action="prev" aria-label="上一週">‹</button><label><span class="hint">選擇週次 </span><input aria-label="選擇週次" type="date" id="week" value="${week}"></label><button data-action="next" aria-label="下一週">›</button><button data-action="today">本週</button></div>
      <div class="settings"><label class="field">標題<input id="title" value="${esc(settings.title)}" maxlength="150"></label><label class="field">Team 組別<select id="team"><option value="">請選擇組別</option>${teams.map(t => `<option value="${esc(t.teamID)}" ${String(t.teamID) === String(settings.teamID) ? 'selected' : ''}>${esc(t.teamName)}</option>`).join('')}</select></label><label class="field">Activity Type<select id="type"><option value="">請選擇類型</option>${typeList().map(a => `<option ${settings.type === a.name ? 'selected' : ''} value="${esc(a.name)}">${esc(a.name)}</option>`).join('')}</select></label><label class="field description">備註（選填，套用到這次勾選的時段）<input id="description" value="${esc(settings.description)}" maxlength="2000"></label></div>
      <div class="toolbar"><select id="template" aria-label="選擇範本"><option value="">套用範本…</option><option value="__default">我的固定 10 小時</option>${Object.keys(templates).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select><input class="template-name" id="templateName" placeholder="新範本名稱" aria-label="新範本名稱" maxlength="40"><button data-action="saveTemplate">儲存時程為範本</button><span class="spacer"></span><button data-action="all">勾選可填時段</button><button data-action="none">全部取消</button><button data-action="add">＋ 自訂時段</button></div>
      <div class="toolbar leave"><span class="hint">整天請假，取消勾選：</span>${[1,2,3,4,5,6,0].map(day => `<button data-action="leave" data-day="${day}">週${'日一二三四五六'[day]}</button>`).join('')}</div>
      <div class="sheet"><table><thead><tr><th>填寫</th><th>日期</th><th>開始</th><th>結束</th><th>時數／狀態</th><th></th></tr></thead><tbody>${rows.map(r => {
        const invalid = C.validate(r, week); const done = r.result === '已送出並確認';
        return `<tr class="${!r.selected ? 'off' : ''}" data-id="${esc(r.id)}"><td><input aria-label="選取 ${esc(r.date)} ${esc(r.start)}" data-field="selected" type="checkbox" ${r.selected ? 'checked' : ''} ${invalid || done ? 'disabled' : ''}></td><td><input aria-label="日期" data-field="date" type="date" min="${week}" max="${C.addDays(week, 6)}" value="${esc(r.date)}"><span class="day">${esc(weekday(r.date))}</span></td><td><input aria-label="開始時間" data-field="start" type="text" inputmode="numeric" placeholder="HH:mm" maxlength="5" value="${esc(r.start)}"></td><td><input aria-label="結束時間" data-field="end" type="text" inputmode="numeric" placeholder="HH:mm" maxlength="5" value="${esc(r.end)}"></td><td class="state ${r.result ? done ? 'good' : 'bad' : invalid ? 'bad' : ''}">${esc(r.result || invalid || `${hours([r])} 小時`)}</td><td><button class="remove" data-action="remove" aria-label="移除此時段">×</button></td></tr>`;
      }).join('')}</tbody></table></div>
      <p class="hint">12:00 為中午（12 PM）；13:00 為下午 1 點。今天即使時間未到也可填寫，明天以後不可填寫（依台北日期）。請假選擇只影響該週，範本只儲存固定時程。</p>
      <div class="note ${message.startsWith('錯誤') ? 'error' : ''}" role="status" aria-live="polite">${esc(message || storageWarning)}</div>
      ${review ? `<section class="review"><h2>確認這次要填寫的紀錄</h2><p>${esc(settings.title)} ／ ${esc(team?.teamName)} ／ ${esc(settings.type)}${settings.description ? ` ／ 備註：${esc(settings.description)}` : ''}</p><ul>${review.map(r => `<li class="${r.ready ? '' : 'skip'}">${esc(r.date)} ${esc(weekday(r.date))} ${r.start}–${r.end}　${r.ready ? '可送出' : '略過：' + esc(r.reason)}</li>`).join('')}</ul><p>將新增 ${review.filter(r => r.ready).length} 筆，共 ${hours(review.filter(r => r.ready))} 小時。送出時會再次查核現有紀錄。</p><div class="actions"><button data-action="back">返回修改</button><button class="primary" data-action="submit" ${!review.some(r => r.ready) ? 'disabled' : ''}>確認送出 ${review.filter(r => r.ready).length} 筆</button></div></section>` : ''}
      </main><footer><div><span class="total">${hours(selected)} <small>小時</small></span><span class="count">已勾選 ${selected.length} 筆</span></div><div class="actions"><button data-action="reload">重新連線</button><button class="primary" data-action="review" ${!loaded || !selected.length || !settings.title?.trim() || !settings.teamID || !settings.type ? 'disabled' : ''}>${busy ? '處理中…' : '檢查紀錄並預覽'}</button></div></footer>`;
    dialog.querySelector('main').scrollTop = previousScroll;
    if (review && !busy) dialog.querySelector('.review').scrollIntoView({ block: 'nearest' });
    if (busy) dialog.querySelectorAll('button,input,select').forEach(el => el.disabled = true);
  }
  async function connect() {
    busy = true; message = '正在確認登入、讀取組別與類型…'; render();
    try {
      const data = await call('options'); teams = data.teams; units = data.units;
      if (!teams.some(t => String(t.teamID) === String(settings.teamID))) settings.teamID = teams.find(t => t.teamName === 'CrossFunctionalFrontEnd')?.teamID ?? '';
      if (!typeList().some(t => t.name === settings.type)) settings.type = typeList().find(t => t.name === 'LabProject')?.name ?? '';
      loaded = true; message = teams.length ? '' : '目前帳號沒有可填寫的 Team 組別。'; save();
    } catch (error) { loaded = false; message = '錯誤：' + error.message; }
    finally { busy = false; render(); }
  }
  launch.onclick = () => { owner = uid(); settings = read('settings', { title: 'MOB', teamID: '', type: 'LabProject', description: '' }); templates = read('templates', {}); loadWeek(); review = null; dialog.showModal(); connect(); };
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  dialog.addEventListener('change', event => {
    if (busy) return;
    const el = event.target; const tr = el.closest('[data-id]');
    if (tr && el.dataset.field) {
      const row = rows.find(r => r.id === tr.dataset.id);
      row[el.dataset.field] = el.dataset.field === 'selected' ? el.checked : el.value; row.result = '';
      if (C.validate(row, week)) row.selected = false;
    } else if (el.id === 'week') {
      if (!C.validDate(el.value)) { render(); return; }
      save(); week = C.monday(el.value); loadWeek(); message = '';
    } else if (el.id === 'team') { settings.teamID = el.value; settings.type = typeList().find(t => t.name === 'LabProject')?.name ?? ''; }
    else if (['title', 'type', 'description'].includes(el.id)) settings[el.id] = el.value;
    else if (el.id === 'template' && el.value) {
      try { rows = C.expand(C.template(el.value === '__default' ? C.defaults : templates[el.value]), week); message = '已套用範本，請依這週實際出勤勾選。'; } catch (error) { message = '錯誤：' + error.message; }
    } else return;
    invalidate(); render();
  });
  dialog.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]'); if (!button || busy) return;
    const action = button.dataset.action;
    if (action === 'close') { dialog.close(); launch.focus(); return; }
    if (action === 'reload') { review = null; await connect(); return; }
    if (['prev', 'next', 'today'].includes(action)) { save(); week = action === 'today' ? C.monday(C.today()) : C.addDays(week, action === 'prev' ? -7 : 7); loadWeek(); message = ''; }
    if (action === 'all') rows.forEach(r => r.selected = !C.validate(r, week) && r.result !== '已送出並確認');
    if (action === 'none') rows.forEach(r => r.selected = false);
    if (action === 'leave') rows.forEach(r => { if (new Date(r.date + 'T00:00:00Z').getUTCDay() === Number(button.dataset.day)) r.selected = false; });
    if (action === 'add') rows.push({ id: crypto.randomUUID(), date: week, start: '10:00', end: '12:00', selected: false, result: '' });
    if (action === 'remove') rows = rows.filter(r => r.id !== button.closest('[data-id]').dataset.id);
    if (action === 'saveTemplate') {
      const name = dialog.querySelector('#templateName').value.trim();
      if (!name || name === '__default') { message = '請輸入新範本名稱。'; render(); return; }
      try { const slots = C.template(rows.map(r => ({ day: new Date(r.date + 'T00:00:00Z').getUTCDay(), start: r.start, end: r.end }))); templates = { ...templates, [name]: slots }; write('templates', templates); message = `已儲存「${name}」，包含所有列出的固定時段。`; } catch (error) { message = '錯誤：' + error.message; }
    }
    if (action === 'back') { review = null; render(); return; }
    if (action === 'review') {
      busy = true; review = null; message = '正在讀取該週現有紀錄，檢查重複與重疊…'; render();
      try { review = C.plan(rows, await call('history'), week); message = ''; } catch (error) { message = '錯誤：' + error.message; }
      finally { busy = false; render(); } return;
    }
    if (action === 'submit') {
      const pending = review?.filter(r => r.ready); if (!pending?.length) return;
      busy = true; message = '正在逐筆送出並查核結果，請保持此頁開啟…'; render();
      try {
        const { results } = await call('submit', { rows: pending, settings });
        for (const result of results) { const row = rows.find(r => r.id === result.id); if (row) { row.result = result.message; row.selected = false; } }
        const done = results.filter(r => r.status === 'success').length, skipped = results.filter(r => r.status === 'skipped').length;
        message = `已確認新增 ${done} 筆，略過 ${skipped} 筆。` + (results.some(r => r.status === 'unknown') ? '有紀錄待確認，已停止後續送出；請先查核學校 History。' : '可至左側 Personal → History 選擇日期範圍查閱；必要時重新整理原網站。');
        review = null; save();
      } catch (error) { review = null; message = '錯誤：' + error.message + '。若曾開始送出，請先查核 History 再重新檢查。'; }
      finally { busy = false; render(); } return;
    }
    invalidate(); render();
  });
  render();
})();
