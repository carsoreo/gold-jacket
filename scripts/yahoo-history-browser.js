// Paste into the DevTools console on a football.fantasysports.yahoo.com tab while signed in.
// Reads each season of your league (team names, manager nicknames, standings, weekly scores, drafts and keepers;
// no emails), then shows a button that copies the result. Save it as data/yahoo-history.json and run `npm run site`.
// Find each season's league number on your Yahoo profile: profiles.sports.yahoo.com → Fantasy → History.
// Yahoo throttles fast reading (error 999), so it waits 3s per page and backs off when blocked;
// finished seasons are kept in localStorage, so a rerun picks up where it stopped.
const SEASONS = [[2020, 20528], [2021, 23769], [2022, 137985], [2023, 353218], [2024, 64015], [2025, 294769], [2026, 190200]];

(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (s) => (s ?? '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim(); // Yahoo icon glyphs live in the private-use range
  const page = async (u) => {
    for (let i = 0; ; i++) {
      await sleep(3000);
      console.log('reading', u, i ? `(retry ${i})` : '');
      const r = await fetch(u, { credentials: 'include' }).catch(() => null);
      if (r?.ok) return new DOMParser().parseFromString(await r.text(), 'text/html');
      if (i > 40) throw new Error(`gave up on ${u}`);
      await sleep(i < 3 ? 120000 : 300000);
    }
  };
  const teamId = (a) => Number((a?.getAttribute('href') ?? '').match(/\/f1\/\d+\/(\d+)(?:$|[/?#])/)?.[1]);
  const done = JSON.parse(localStorage.getItem('__hist') || '[]');
  for (const [year, lid] of SEASONS) {
    if (done.some((s) => s.year === year)) continue;
    const base = `/${year}/f1/${lid}`;
    const s = { year, leagueId: lid, teams: [], weeks: [], draft: [] };

    for (const tr of (await page(`${base}/teams`)).querySelectorAll('table tr')) {
      const a = [...tr.querySelectorAll('td a[href*="/f1/"]')].find((x) => clean(x.textContent));
      const m = tr.querySelector('td.user-id'); // the next column is email: deliberately not read
      if (a && m) s.teams.push({ id: teamId(a), name: clean(a.textContent), manager: clean(m.textContent).replace(/(Co-)?Commissioner$/, '') });
    }

    // Final standings: for a finished season Yahoo's rank is the final (playoff) finish.
    const tbl = [...(await page(`${base}?lhst=stand`)).querySelectorAll('table')].find((t) => /W-L-T/.test(t.querySelector('tr')?.textContent));
    if (tbl) {
      const head = [...tbl.querySelectorAll('tr')[0].children].map((c) => clean(c.textContent));
      for (const tr of [...tbl.querySelectorAll('tr')].slice(1)) {
        const c = [...tr.children].map((x) => clean(x.textContent));
        const t = s.teams.find((x) => x.id === teamId(tr.querySelector('a[href*="/f1/"]'))); if (!t) continue;
        const col = (n) => c[head.indexOf(n)];
        const [w, l, ti] = (col('W-L-T') ?? '').split('-').map(Number);
        Object.assign(t, { rank: parseInt(c[0].replace(/\D/g, '')), wins: w, losses: l, ties: ti, pf: parseFloat(col('PF')), pa: parseFloat(col('PA')) });
      }
    }

    const sets = [...(await page(`${base}/settings`)).querySelectorAll('tr')].map((r) => clean(r.textContent));
    s.playoffsText = sets.find((x) => x.startsWith('Playoffs:')) ?? '';
    s.playoffTeams = Number(s.playoffsText.match(/(\d+) teams/)?.[1]); s.playoffStart = Number(s.playoffsText.match(/Week (\d+)/)?.[1]);
    s.rosterPositions = sets.find((x) => x.startsWith('Roster Positions:'))?.slice(18);

    const first = await page(`${base}?matchup_week=1`);
    const nWeeks = Math.max(...[...first.querySelectorAll('#matchupweek *')].map((e) => Number(e.childElementCount === 0 && e.textContent.trim().match(/^Week (\d+)$/)?.[1]) || 0));
    for (let w = 1; w <= nWeeks; w++) {
      const d = w === 1 ? first : await page(`${base}?matchup_week=${w}`);
      const games = [];
      for (const li of d.querySelectorAll('#matchupweek li')) {
        const teams = [...li.querySelectorAll('a.F-link')]; const pts = [...li.querySelectorAll('div.Fz-lg')].map((x) => parseFloat(x.textContent));
        if (teams.length === 2 && pts.length === 2) games.push(teams.map((a, i) => ({ team: teamId(a), points: pts[i] })));
      }
      s.weeks.push({ week: w, games });
    }

    // One table per draft round, in order.
    [...(await page(`${base}/draftresults`)).querySelectorAll('table')].filter((t) => t.querySelector('td.player')).forEach((tb, i) => {
      for (const tr of tb.querySelectorAll('tr')) {
        const pick = parseInt(clean(tr.querySelector('td.first')?.textContent));
        const team = s.teams.find((t) => t.name === clean(tr.querySelector('td.last')?.textContent));
        const keeper = !!tr.querySelector('[title="This player is a keeper."]');
        if (pick) s.draft.push({ round: i + 1, pick, player: clean(tr.querySelector('td.player a.name')?.textContent || tr.querySelector('td.player')?.textContent), team: team?.id ?? null, keeper });
      }
    });
    done.push(s);
    localStorage.setItem('__hist', JSON.stringify(done));
  }
  const b = Object.assign(document.createElement('button'), { textContent: 'Copy history (yahoo-history.json)' });
  b.style.cssText = 'position:fixed;top:120px;left:50%;transform:translateX(-50%);z-index:999999;padding:16px 24px;font:700 18px sans-serif';
  b.onclick = async () => { await navigator.clipboard.writeText(JSON.stringify(done)); b.textContent = 'Copied'; };
  document.body.append(b);
  console.log('Done. Click the button, then paste into data/yahoo-history.json. Clear the saved progress with: localStorage.removeItem("__hist")');
})();
