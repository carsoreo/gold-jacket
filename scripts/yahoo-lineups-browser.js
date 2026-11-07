// Paste into the DevTools console on a football.fantasysports.yahoo.com tab while signed in.
// Reads every team's weekly lineup (each player's slot and fantasy points) for the seasons below, then shows a
// button that copies the result. Save it as data/yahoo-lineups.json and run `npm run site` for player stats.
// About 10 teams x 17 weeks per season at a few seconds a page, so expect a couple of hours for seven seasons.
// Progress is kept in localStorage, so rerunning picks up where it stopped.
const SEASONS = [[2020, 20528, 16], [2021, 23769, 17], [2022, 137985, 17], [2023, 353218, 17], [2024, 64015, 17], [2025, 294769, 17], [2026, 190200, 8]]; // [year, league number, weeks]
// For the season in progress, list only finished weeks: a week read mid-week keeps its partial points, since
// weeks already saved are skipped. To reread one, remove it from localStorage `__lineups_<year>` first.
const TEAMS = 10;

(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (s) => (s ?? '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim(); // Yahoo icon glyphs live in the private-use range
  const page = async (u) => {
    for (let i = 0; ; i++) {
      await sleep(3000);
      const r = await fetch(u, { credentials: 'include' }).catch(() => null);
      if (r?.ok) return new DOMParser().parseFromString(await r.text(), 'text/html');
      if (i > 40) throw new Error(`gave up on ${u}`);
      await sleep(i < 3 ? 120000 : 300000); // Yahoo throttles fast reading (error 999)
    }
  };
  for (const [year, lid, weeks] of SEASONS) {
    const key = `__lineups_${year}`;
    const rows = JSON.parse(localStorage.getItem(key) || '[]');
    const have = new Set(rows.map((r) => `${r.w}:${r.t}`));
    for (let w = 1; w <= weeks; w++) for (let t = 1; t <= TEAMS; t++) {
      if (have.has(`${w}:${t}`)) continue;
      console.log('reading', year, 'week', w, 'team', t);
      const d = await page(`/${year}/f1/${lid}/${t}/team?&week=${w}`);
      // Read Fan Pts by real column position: cells can span columns (2026 added an Action column, and a "Bye"
      // label spans Fan Pts and Proj Pts). A Bye label is saved as null; the site fills it from the team score.
      const at = (cells, col) => { let c = 0; for (const el of cells) { const span = el.colSpan || 1; if (col < c + span) return el; c += span; } return null; };
      const p = [];
      for (const tb of d.querySelectorAll('#statTable0, #statTable1, #statTable2')) {
        let col = 0, fan = -1;
        for (const h of tb.querySelectorAll('thead tr')[1]?.children ?? []) { if (clean(h.textContent) === 'Fan Pts') fan = col; col += h.colSpan || 1; }
        for (const tr of tb.querySelectorAll('tbody tr')) {
          const a = tr.children[1]?.querySelector('a.name'); if (!a) continue;
          const pid = Number((a.getAttribute('href') ?? '').match(/(\d+)\/?$/)?.[1]) || null;
          const txt = clean(at([...tr.children], fan)?.textContent);
          p.push([pid, clean(a.textContent), clean(tr.children[0].textContent), /^-?\d+(\.\d+)?$/.test(txt) ? parseFloat(txt) : txt === '-' ? 0 : null]);
        }
      }
      rows.push({ w, t, p });
      localStorage.setItem(key, JSON.stringify(rows));
    }
  }
  const all = Object.fromEntries(SEASONS.map(([y]) => [y, JSON.parse(localStorage.getItem(`__lineups_${y}`) || '[]')]));
  const b = Object.assign(document.createElement('button'), { textContent: 'Copy lineups (yahoo-lineups.json)' });
  b.style.cssText = 'position:fixed;top:120px;left:50%;transform:translateX(-50%);z-index:999999;padding:16px 24px;font:700 18px sans-serif';
  b.onclick = async () => { await navigator.clipboard.writeText(JSON.stringify(all)); b.textContent = 'Copied'; };
  document.body.append(b);
  console.log('Done. Click the button, then paste into data/yahoo-lineups.json.');
})();
