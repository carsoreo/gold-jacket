// Paste into the DevTools console on a football.fantasysports.yahoo.com tab while signed in.
// Reads every trade for the seasons below (what each side received: players and draft picks), then shows a
// button that copies the result. Save it as data/yahoo-trades.json and run `npm run site` for the Trades tab.
const SEASONS = [[2020, 20528], [2021, 23769], [2022, 137985], [2023, 353218], [2024, 64015], [2025, 294769], [2026, 190200]]; // [year, league number]

(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Yahoo throttles fast reading (error 999): wait and retry, so a throttled page never reads as "no trades".
  const page = async (u) => {
    for (let i = 0; ; i++) {
      await sleep(2500);
      const r = await fetch(u, { credentials: 'include' }).catch(() => null);
      if (r?.ok) return new DOMParser().parseFromString(await r.text(), 'text/html');
      if (i > 40) throw new Error(`gave up on ${u}`);
      await sleep(i < 3 ? 120000 : 300000);
    }
  };
  const clean = (s) => (s ?? '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim(); // Yahoo icon glyphs live in the private-use range
  // One row per side of a trade; a row with 4 cells starts a new trade.
  const parse = (d) => {
    const trades = []; let cur = null;
    for (const tr of d.querySelector('table')?.querySelectorAll('tr') ?? []) {
      if (tr.children.length >= 4 || !cur) { cur = { sides: [] }; trades.push(cur); }
      const items = tr.querySelector('td.No-pstart'), team = tr.querySelector('td.Ta-end');
      if (!items || !team) continue;
      const players = [], picks = [];
      for (const p of items.querySelectorAll('p')) {
        const a = p.querySelector('a');
        if (a && clean(a.textContent)) players.push([clean(a.textContent), clean(p.querySelector('.F-position')?.textContent).split(' - ')[1] ?? null]);
        else { const m = clean(p.textContent).match(/^Round (\d+)(?: \(traded from (.+)\))?$/); if (m) picks.push(m[2] ? `Round ${m[1]} (from ${m[2]})` : `Round ${m[1]}`); }
      }
      cur.date = clean(team.querySelector('.F-timestamp')?.textContent);
      cur.sides.push({ team: Number((team.querySelector('a')?.getAttribute('href') ?? '').match(/\/(\d+)\/?$/)?.[1]), players, picks });
    }
    return trades.filter((t) => t.sides.length);
  };
  const out = {};
  for (const [year, lid] of SEASONS) {
    out[year] = [];
    for (let off = 0; ; off += 25) { // 25 trades per page; `count` is the offset
      const t = parse(await page(`/${year}/f1/${lid}/transactions?transactionsfilter=trade${off ? `&count=${off}` : ''}`));
      out[year].push(...t);
      if (t.length < 25) break;
    }
    console.log(year, out[year].length, 'trades');
  }
  const b = Object.assign(document.createElement('button'), { textContent: 'Copy trades (yahoo-trades.json)' });
  b.style.cssText = 'position:fixed;top:120px;left:50%;transform:translateX(-50%);z-index:999999;padding:16px 24px;font:700 18px sans-serif';
  b.onclick = async () => { await navigator.clipboard.writeText(JSON.stringify(out)); b.textContent = 'Copied'; };
  document.body.append(b);
})();
