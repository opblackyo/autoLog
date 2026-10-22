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
  function write(key, value) { try { localStorage.setItem(`${namespace()}.${key}`, JSON.stringify(value)); return true; } catch { storageWarning = '瀏覽器無法儲存設定，關閉後可能遺失。'; return false; } }
  let week = C.monday(C.today()), rows = [], teams = [], units = [], review = null, busy = false, message = '', loaded = false;
  let owner = uid(), settingsOpen = false, templateOpen = false, deletedTemplate = null;
  let settings = read('settings', { title: 'MOB', teamID: '', type: 'LabProject', description: '' });
  let templates = read('templates', {});
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) templates = {};
  function loadWeek() { const draft = read(`week.${week}`, null); rows = Array.isArray(draft) ? draft.map(r => ({ ...r, result: '' })) : C.expand(C.defaults, week); }
  loadWeek();
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial;font-family:"Microsoft JhengHei","Segoe UI",sans-serif;color:#23383e;font-size:15px;line-height:1.5}
    *{box-sizing:border-box}button,input,select{font:inherit}button,summary{cursor:pointer}button:disabled{cursor:default;opacity:.5}
    button,input,select{border:1px solid #bbcdd2;border-radius:7px;padding:9px 12px;background:white;color:#23383e;min-height:44px}
    button:hover:not(:disabled){background:#e6f4f5}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #0797a8;outline-offset:2px}
    .launch{position:fixed;right:26px;bottom:26px;z-index:2147483646;background:#087c89;color:white;border:0;box-shadow:0 4px 20px #183c4540;padding:14px 22px;font-weight:700}
    dialog{border:0;border-radius:14px;padding:0;margin:auto;width:min(1080px,calc(100vw - 32px));max-width:none;max-height:94dvh;color:inherit;font:inherit;background:#f3f8fa;box-shadow:0 20px 100px #17353d55;overflow:hidden}
    dialog[open]{display:flex;flex-direction:column}dialog::backdrop{background:#162d3a80}header{padding:19px 26px 16px;background:white;border-bottom:1px solid #d7e3e7;display:flex;justify-content:space-between;gap:16px;align-items:start;flex-shrink:0}
    h1{font-size:22px;margin:0 0 3px;font-weight:750}h2{font-size:17px;margin:0}p{margin:0}.sub,.hint{color:#526d77;font-size:13px}.x{font-size:24px;line-height:1;padding:8px 12px;border:0;min-width:44px}
    main{padding:18px 26px;display:block;overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-gutter:stable}main>*+*{margin-top:16px}
    .week{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.week strong{font-size:19px;margin-right:auto}.week-controls{display:flex;gap:6px;align-items:center}.week input{width:151px}.week .nav{font-size:22px;padding:3px 12px}.week-label{font-size:13px;color:#526d77}
    details{border:1px solid #d7e3e7;border-radius:8px;background:white}summary{padding:12px 14px;min-height:48px;font-size:14px;overflow-wrap:anywhere}summary .summary-value{margin-left:12px;font-weight:600}summary .edit-hint{float:right;color:#087c89;font-size:13px;margin-left:10px}.settings{padding:0 14px 16px;display:grid;grid-template-columns:1fr 2fr 1.2fr;gap:12px}label.field{display:grid;gap:5px;font-size:13px;color:#526d77}.field input,.field select{min-width:0;width:100%;color:#23383e}.description{grid-column:1/-1}
    .schedule-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}.toolbar button,.toolbar select{font-size:13px}.toolbar select{max-width:240px}.toolbar .spacer{flex:1}.leave{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px}.leave button{font-size:13px;padding:7px 12px}.leave .hint{margin-right:4px}.sheet{background:white;border:1px solid #d7e3e7;border-radius:9px;overflow:hidden;min-height:0}
    table{border-collapse:collapse;width:100%;font-size:14px}th{text-align:left;font-weight:500;font-size:12px;color:#526d77;background:#eaf2f5;padding:9px 12px}td{padding:8px 12px;border-top:1px solid #e3ecef;vertical-align:middle}tbody tr{cursor:pointer}tbody tr:hover{background:#edf8f8}tbody tr.selected{background:#f1faf9}tbody tr.off{background:#fafcfd;color:#667d86}.select-cell{width:115px;padding:6px 10px}.row-select{display:flex;align-items:center;gap:10px;min-height:48px;cursor:pointer;font-size:13px;font-weight:650}.row-select:has(input:disabled){cursor:default}.row-select input{accent-color:#087c89;width:22px;height:22px;min-height:22px;flex-shrink:0;cursor:inherit;margin:0}.date-cell{width:230px;white-space:nowrap}.day{font-size:12px;color:#526d77;margin-left:8px;display:inline-block}td input[data-field=start],td input[data-field=end]{width:92px;padding:8px;font-variant-numeric:tabular-nums}td input[type=date]{width:148px;padding:7px}.mobile-label{display:none}.state{font-size:13px;color:#526d77;max-width:210px;overflow-wrap:anywhere}.state.bad{color:#a34a25}.state.good{color:#087c62}.remove{border:0;min-width:44px;padding:6px 10px;background:transparent;color:#526d77;font-size:20px}.remove-cell{width:54px;padding:6px}.time-rule{margin-top:12px}.template-tools{margin-top:14px}.template-body{padding:0 14px 14px;display:flex;gap:8px;flex-wrap:wrap}.template-body input{flex:1;min-width:140px}.template-body .hint{width:100%}
    .note{padding:11px 14px;background:#e5f2f5;border-left:3px solid #128f9d;font-size:13px;white-space:pre-line;overflow-wrap:anywhere}.note:empty{display:none}.error{border-color:#bb682f;background:#fff3e8;color:#88431e}
    .template-manager{width:100%;border-top:1px solid #d7e3e7;padding-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:end}.template-manager label{flex:1;min-width:160px}.template-manager select{width:100%}.delete-template{color:#a34a25;border-color:#d7ac99}.template-undo{width:100%;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;overflow-wrap:anywhere}
    footer{padding:14px 26px;display:flex;justify-content:space-between;align-items:center;gap:14px;background:white;border-top:1px solid #d7e3e7;flex-shrink:0}.total{font-size:26px;font-weight:750;color:#087c89}.total small{font-size:13px;font-weight:400;color:#526d77}.primary{background:#087c89;color:white;border-color:#087c89;font-weight:650}.primary:hover:not(:disabled){background:#086774}.actions{display:flex;gap:8px}.review{border:1px solid #128f9d;border-radius:8px;padding:18px;background:white}.review ul{padding-left:22px;margin:14px 0}.review li{padding:8px 0;border-bottom:1px solid #e3ecef;font-variant-numeric:tabular-nums}.review .skip{color:#a34a25}.review p{font-size:13px;margin-top:7px}.count{margin-left:10px;font-size:13px;color:#526d77}
    @media(min-width:981px){.schedule{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px 16px}.schedule-head{grid-column:1;margin:0}.schedule-head .hint{display:none}.toolbar{grid-column:2;margin:0;justify-content:flex-end}.toolbar .spacer{display:none}.toolbar select{max-width:170px}.leave,.sheet,.time-rule,.template-tools,.schedule>.note{grid-column:1/-1;margin:0}}
    @media(min-width:721px) and (max-width:980px){.date-cell{width:170px}.day{display:block;margin:3px 0 0}.select-cell{width:105px}td,th{padding-left:8px;padding-right:8px}.settings{grid-template-columns:1fr 1fr}.description{grid-column:1/-1}}
    @media(max-width:720px){header{padding:16px}main{padding:14px}footer{padding:12px 16px;flex-wrap:wrap}.settings{grid-template-columns:1fr}.description{grid-column:auto}.week strong{width:100%}.week-controls{width:100%}.week input{width:145px}.week-label{display:none}dialog{width:calc(100vw - 16px);max-height:96dvh}.launch{right:14px;bottom:14px}summary .summary-value{display:block;margin:5px 0 0}summary .edit-hint{float:none;display:none}.toolbar .spacer{display:none}.toolbar select{max-width:100%;flex:1}.schedule-head{align-items:center}.schedule-head button{font-size:13px;padding:8px}.sheet{border:0;background:transparent;overflow:visible}table,tbody{display:block;width:100%}thead{display:none}tbody tr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 14px;position:relative;border:1px solid #d7e3e7;border-radius:9px;padding:12px;margin-bottom:10px;background:white}td{border:0;padding:0;min-width:0}.select-cell{width:auto;grid-column:1/-1;padding:0 44px 0 0}.row-select{min-height:44px}.date-cell{width:auto;grid-column:1/-1;display:flex;gap:10px;align-items:center}.day{display:inline;margin:0}td input[type=date]{width:158px}.time-cell{display:grid;gap:4px}td input[data-field=start],td input[data-field=end]{width:100%;min-width:0}.mobile-label{display:block;font-size:12px;color:#526d77}.state{grid-column:1/-1;max-width:none}.remove-cell{position:absolute;right:6px;top:12px;width:44px}.actions{margin-left:auto}.total{font-size:24px}.count{margin-left:6px}footer .actions{flex-wrap:wrap;justify-content:flex-end}.leave{gap:6px}.leave .hint{width:100%}}
    @media(max-width:720px){summary .summary-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.week-controls{display:grid;grid-template-columns:44px minmax(0,1fr) 44px auto;gap:4px}.week-controls label{min-width:0}.week-controls input{width:100%;min-width:0;padding:8px 4px}.week-controls .nav{padding:4px;min-width:44px}.week-controls button:last-child{padding:8px}.schedule-head .hint{display:none}}
    @media(max-width:720px){.schedule{display:flex;flex-direction:column;gap:12px}.schedule-head,.toolbar,.leave,.sheet,.time-rule,.template-tools{margin:0}.schedule-head{order:0}.toolbar{order:1}.sheet{order:2}.leave{order:3}.time-rule{order:4}.template-tools{order:5}.schedule>.note{order:6}.template-body select{width:100%}}
    @media(max-width:420px){h1{font-size:20px}footer{gap:8px}.actions{gap:6px}.actions button{font-size:13px;padding:8px 10px}.sub{font-size:12px}}
    @media(max-height:600px){header{padding-top:12px;padding-bottom:10px}header .sub{display:none}footer{padding-top:10px;padding-bottom:10px}main{padding-top:12px;padding-bottom:12px}}
  `;
  root.append(style);
  const launch = document.createElement('button'); launch.className = 'launch'; launch.textContent = '▦ 快速填寫';
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', '每週上班時段快速填寫');
  root.append(launch, dialog);
  const compactLayout = matchMedia('(max-width:720px)');
  function positionTemplatePicker() {
    const picker = dialog.querySelector('#template');
    const destination = dialog.querySelector(compactLayout.matches ? '.template-body' : '.toolbar');
    if (picker && destination && picker.parentElement !== destination) destination.append(picker);
  }
  compactLayout.addEventListener('change', positionTemplatePicker);
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
    const previousReview = !!dialog.querySelector('.review');
    const focus = root.activeElement;
    const focusRow = focus?.closest('[data-id]')?.dataset.id;
    const focusField = focus?.dataset.field;
    if (dialog.querySelector('#preferences')) settingsOpen = dialog.querySelector('#preferences').open;
    if (dialog.querySelector('#templateTools')) templateOpen = dialog.querySelector('#templateTools').open;
    const selected = rows.filter(r => r.selected && !C.validate(r, week));
    const team = teams.find(t => String(t.teamID) === String(settings.teamID));
    const ready = review?.filter(r => r.ready) || [];
    const scheduledDays = [1, 2, 3, 4, 5, 6, 0].filter(day => rows.some(r => new Date(r.date + 'T00:00:00Z').getUTCDay() === day));
    const needsSettings = loaded && (!settings.title?.trim() || !team || !settings.type);
    const prominentMessage = message.startsWith('錯誤') || message.startsWith('已確認') || busy;
    dialog.innerHTML = `<header><div><h1>這週的上班時段</h1><p class="sub">${demo ? '互動示範，所有資料都只在此頁模擬。' : '依實際出勤勾選，請假時段取消即可。'} 時間以台北、24 小時制顯示。</p></div><button class="x" data-action="close" aria-label="關閉" ${busy ? 'disabled' : ''}>×</button></header>
      <main><div class="week"><strong>${esc(week.replaceAll('-', '/'))} — ${esc(C.addDays(week, 6).slice(5).replace('-', '/'))}</strong><div class="week-controls"><button class="nav" data-action="prev" aria-label="上一週">‹</button><label><span class="week-label">週次 </span><input aria-label="選擇週次" type="date" id="week" value="${week}"></label><button class="nav" data-action="next" aria-label="下一週">›</button><button data-action="today">本週</button></div></div>
      <details id="preferences" ${settingsOpen || needsSettings ? 'open' : ''}><summary><span>填寫設定與備註</span><span class="edit-hint">展開修改</span><span class="summary-value">${esc(settings.title || '請填標題')} ／ ${esc(team?.teamName || '請選擇組別')} ／ ${esc(settings.type || '請選擇類型')}${settings.description ? '（含備註）' : ''}</span></summary><div class="settings"><label class="field">標題<input id="title" value="${esc(settings.title)}" maxlength="150"></label><label class="field">Team 組別<select id="team"><option value="">請選擇組別</option>${teams.map(t => `<option value="${esc(t.teamID)}" ${String(t.teamID) === String(settings.teamID) ? 'selected' : ''}>${esc(t.teamName)}</option>`).join('')}</select></label><label class="field">Activity Type<select id="type"><option value="">請選擇類型</option>${typeList().map(a => `<option ${settings.type === a.name ? 'selected' : ''} value="${esc(a.name)}">${esc(a.name)}</option>`).join('')}</select></label><label class="field description">備註（選填，套用到這次勾選的時段）<input id="description" value="${esc(settings.description)}" maxlength="2000"></label></div></details>
      ${prominentMessage && message ? `<div class="note ${message.startsWith('錯誤') ? 'error' : ''}" role="status" aria-live="polite">${esc(message)}</div>` : ''}
      ${review ? `<section class="review" aria-label="送出前預覽"><h2>確認這次要填寫的紀錄</h2><p>${esc(settings.title)} ／ ${esc(team?.teamName)} ／ ${esc(settings.type)}${settings.description ? ` ／ 備註：${esc(settings.description)}` : ''}</p><ul>${review.map(r => `<li class="${r.ready ? '' : 'skip'}">${esc(r.date)} ${esc(weekday(r.date))} ${r.start}–${r.end}　${r.ready ? '可送出' : '略過：' + esc(r.reason)}</li>`).join('')}</ul><p>將新增 ${ready.length} 筆，共 ${hours(ready)} 小時。送出時會再次查核現有紀錄。</p></section>` : `
      <section class="schedule" aria-label="時段選擇"><div class="schedule-head"><div><h2>勾選實際出勤時段</h2><p class="hint">可點勾選區或整列空白處切換。</p></div><button data-action="add">＋ 自訂時段</button></div>
      <div class="toolbar"><button data-action="all">勾選可填時段</button><button data-action="none">全部取消</button><span class="spacer"></span><select id="template" aria-label="選擇範本"><option value="">套用範本…</option><option value="__default">我的固定 10 小時</option>${Object.keys(templates).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></div>
      <div class="leave"><span class="hint">整天請假，取消勾選：</span>${[1,2,3,4,5,6,0].map(day => `<button data-action="leave" data-day="${day}" ${scheduledDays.includes(day) ? '' : 'hidden'}>週${'日一二三四五六'[day]}</button>`).join('')}</div>
      <div class="sheet"><table aria-label="每週出勤時段"><thead><tr><th scope="col">勾選填寫</th><th scope="col">日期</th><th scope="col">開始</th><th scope="col">結束</th><th scope="col">時數／狀態</th><th scope="col"><span class="hint">移除</span></th></tr></thead><tbody>${rows.map(r => {
        const invalid = C.validate(r, week); const done = r.result === '已送出並確認';
        return `<tr class="${r.selected && !invalid ? 'selected' : 'off'}" data-id="${esc(r.id)}"><td class="select-cell"><label class="row-select"><input aria-label="選取 ${esc(r.date)} ${esc(r.start)}" aria-describedby="state-${esc(r.id)}" data-field="selected" type="checkbox" ${r.selected ? 'checked' : ''} ${invalid || done ? 'disabled' : ''}><span>${done ? '已完成' : invalid ? '不可填' : r.selected ? '已勾選' : '未勾選'}</span></label></td><td class="date-cell"><input aria-label="日期" data-field="date" type="date" min="${week}" max="${C.addDays(week, 6)}" value="${esc(r.date)}"><span class="day">${esc(weekday(r.date))}</span></td><td class="time-cell"><span class="mobile-label">開始時間</span><input aria-label="開始時間" data-field="start" type="text" inputmode="numeric" placeholder="HH:mm" maxlength="5" value="${esc(r.start)}"></td><td class="time-cell"><span class="mobile-label">結束時間</span><input aria-label="結束時間" data-field="end" type="text" inputmode="numeric" placeholder="HH:mm" maxlength="5" value="${esc(r.end)}"></td><td id="state-${esc(r.id)}" class="state ${r.result ? done ? 'good' : 'bad' : invalid ? 'bad' : ''}">${esc(r.result || invalid || `${hours([r])} 小時`)}</td><td class="remove-cell"><button class="remove" data-action="remove" aria-label="移除此時段">×</button></td></tr>`;
      }).join('')}</tbody></table></div>
      ${rows.length ? '' : '<p class="note">這週還沒有時段，可套用固定範本或新增自訂時段。</p>'}
      <p class="hint time-rule">今天可提前填，明天以後不可填。12:00 是中午；13:00 是下午 1 點。請假勾選只影響這一週。</p>
      <details id="templateTools" class="template-tools" ${templateOpen ? 'open' : ''}><summary>套用或管理時程範本</summary><div class="template-body"><input id="templateName" placeholder="新範本名稱" aria-label="新範本名稱" maxlength="40"><button data-action="saveTemplate">儲存時程為範本</button><p class="hint">儲存上方所有時段，不包含當週的請假勾選。</p><div class="template-manager"><label class="field">刪除自訂範本<select id="templateToDelete" ${Object.keys(templates).length ? '' : 'disabled'}><option value="">${Object.keys(templates).length ? '選擇要刪除的範本…' : '目前沒有自訂範本'}</option>${Object.keys(templates).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label><button class="delete-template" data-action="deleteTemplate" disabled>刪除範本</button><p class="hint">只刪除選定範本，當週時段與草稿會保留。內建「我的固定 10 小時」無法刪除。</p></div>${deletedTemplate ? `<div class="template-undo" role="status"><span>已刪除「${esc(deletedTemplate.name)}」</span><button data-action="undoDeleteTemplate">復原刪除</button></div>` : ''}</div></details></section>`}
      ${!prominentMessage && (message || storageWarning) ? `<div class="note" role="status" aria-live="polite">${esc(message || storageWarning)}</div>` : ''}
      </main><footer><div><span class="total">${hours(review ? ready : selected)} <small>小時</small></span><span class="count">${review ? '將新增' : '已勾選'} ${review ? ready.length : selected.length} 筆</span></div><div class="actions">${review ? `<button data-action="back">返回修改</button><button class="primary" data-action="submit" ${!ready.length ? 'disabled' : ''}>${busy ? '處理中…' : `確認送出 ${ready.length} 筆`}</button>` : `<button data-action="reload">重新連線</button><button class="primary" data-action="review" ${!loaded || !selected.length || !settings.title?.trim() || !settings.teamID || !settings.type ? 'disabled' : ''}>${busy ? '處理中…' : '檢查紀錄並預覽'}</button>`}</div></footer>`;
    positionTemplatePicker();
    dialog.querySelector('main').scrollTop = previousReview !== !!review ? 0 : previousScroll;
    if (busy) dialog.querySelectorAll('button,input,select').forEach(el => el.disabled = true);
    else if (focusRow && focusField) {
      const row = Array.from(dialog.querySelectorAll('[data-id]')).find(el => el.dataset.id === focusRow);
      const input = row?.querySelector(`[data-field="${focusField}"]`);
      if (input && !input.disabled) input.focus({ preventScroll: true });
    }
  }
  // Keep inputs and action buttons mounted when an edit blurs. Replacing the
  // dialog here would swallow the user's following click on Preview or Add.
  function refreshFeedback() {
    for (const tr of dialog.querySelectorAll('tbody tr')) {
      const row = rows.find(r => r.id === tr.dataset.id);
      const invalid = C.validate(row, week), done = row.result === '已送出並確認';
      tr.className = row.selected && !invalid ? 'selected' : 'off';
      const checkbox = tr.querySelector('[data-field="selected"]');
      checkbox.checked = row.selected;
      checkbox.disabled = !!invalid || done;
      checkbox.setAttribute('aria-label', `選取 ${row.date} ${row.start}`);
      tr.querySelector('.row-select span').textContent = done ? '已完成' : invalid ? '不可填' : row.selected ? '已勾選' : '未勾選';
      tr.querySelector('.day').textContent = C.validDate(row.date) ? weekday(row.date) : '請選擇日期';
      const state = tr.querySelector('.state');
      state.textContent = row.result || invalid || `${hours([row])} 小時`;
      state.className = `state ${row.result ? done ? 'good' : 'bad' : invalid ? 'bad' : ''}`;
    }
    for (const button of dialog.querySelectorAll('[data-action="leave"]')) {
      button.hidden = !rows.some(row => new Date(row.date + 'T00:00:00Z').getUTCDay() === Number(button.dataset.day));
    }
    const team = teams.find(t => String(t.teamID) === String(settings.teamID));
    dialog.querySelector('.summary-value').textContent = `${settings.title || '請填標題'} ／ ${team?.teamName || '請選擇組別'} ／ ${settings.type || '請選擇類型'}${settings.description ? '（含備註）' : ''}`;
    const selected = rows.filter(r => r.selected && !C.validate(r, week));
    dialog.querySelector('.total').innerHTML = `${hours(selected)} <small>小時</small>`;
    dialog.querySelector('.count').textContent = `已勾選 ${selected.length} 筆`;
    const previewButton = dialog.querySelector('[data-action="review"]');
    if (previewButton) previewButton.disabled = !loaded || !selected.length || !settings.title?.trim() || !settings.teamID || !settings.type;
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
  launch.onclick = () => { owner = uid(); deletedTemplate = null; settings = read('settings', { title: 'MOB', teamID: '', type: 'LabProject', description: '' }); templates = read('templates', {}); loadWeek(); review = null; dialog.showModal(); connect(); };
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  dialog.addEventListener('change', event => {
    if (busy) return;
    const el = event.target; const tr = el.closest('[data-id]');
    if (el.id === 'templateToDelete') {
      dialog.querySelector('[data-action="deleteTemplate"]').disabled = !el.value || el.value === '__default' || !Object.hasOwn(templates, el.value);
      return;
    }
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
    const keepMounted = !dialog.querySelector('.review') && ((tr && el.dataset.field !== 'selected') || ['title', 'description'].includes(el.id));
    invalidate();
    if (keepMounted) refreshFeedback(); else render();
  });
  dialog.addEventListener('click', async event => {
    if (busy) { event.preventDefault(); return; }
    const clickedRow = event.target.closest('[data-id]');
    if (clickedRow && !event.target.closest('button,input,label,select,.time-cell,.date-cell')) {
      const checkbox = clickedRow.querySelector('input[type="checkbox"]');
      if (!checkbox.disabled) checkbox.click();
      return;
    }
    const button = event.target.closest('button[data-action]'); if (!button) return;
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
      try { const slots = C.template(rows.map(r => ({ day: new Date(r.date + 'T00:00:00Z').getUTCDay(), start: r.start, end: r.end }))); templates = { ...templates, [name]: slots }; write('templates', templates); if (deletedTemplate?.name === name) deletedTemplate = null; message = `已儲存「${name}」，包含所有列出的固定時段。`; } catch (error) { message = '錯誤：' + error.message; }
    }
    if (action === 'deleteTemplate') {
      const name = dialog.querySelector('#templateToDelete').value;
      if (!name || name === '__default' || !Object.hasOwn(templates, name)) return;
      const remaining = { ...templates };
      delete remaining[name];
      if (write('templates', remaining)) {
        deletedTemplate = { name, slots: templates[name] };
        templates = remaining;
        message = `已刪除「${name}」，當週時段與草稿已保留。`;
      } else message = '錯誤：無法儲存刪除結果，範本未刪除。';
      render(); return;
    }
    if (action === 'undoDeleteTemplate') {
      if (!deletedTemplate || Object.hasOwn(templates, deletedTemplate.name)) return;
      const restored = { ...templates, [deletedTemplate.name]: deletedTemplate.slots };
      if (write('templates', restored)) {
        message = `已復原「${deletedTemplate.name}」。`;
        templates = restored;
        deletedTemplate = null;
      } else message = '錯誤：無法儲存復原結果，請再試一次。';
      render(); return;
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
