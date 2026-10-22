(() => {
  const C = AutoLogCore, history = [];
  const teams = [{ teamID: 'demo-team', teamName: 'CrossFunctionalFrontEnd' }];
  const units = [{ unitID: 'demo-team', unitName: 'CrossFunctionalFrontEnd', activityTypeList: [{ name: 'LabProject', enable: true }, { name: 'Meeting', enable: true }] }];
  globalThis.AutoLogDemo = { async call(op, msg) {
    if (op === 'options') return { teams, units };
    if (op === 'history') return structuredClone(history);
    if (op === 'submit') {
      const results = [];
      for (const row of msg.rows) {
        const checked = C.plan([{ ...row, selected: true }], history, msg.week)[0];
        if (!checked.ready) results.push({ id: row.id, status: 'skipped', message: checked.reason });
        else { history.push(C.payload(row, msg.settings, 'demo-user')); results.push({ id: row.id, status: 'success', message: '已送出並確認' }); }
      }
      return { results };
    }
    throw new Error('未知示範操作');
  } };
  document.getElementById('open').onclick = () => document.getElementById('autolog-helper').shadowRoot.querySelector('.launch').click();
})();
