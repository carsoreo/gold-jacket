// League history stats for the Hall of Fame site. Input: seasons as collected from Yahoo
// ({ year, teams: [{ id, name, manager, rank, wins, losses, ties, pf, pa }], weeks: [{ week, games: [[{ team, points }, …]] }], draft, playoffStart }).

const round2 = (n) => Math.round(n * 100) / 100;
// Yahoo's draft page for a current season adds the player's team and position ("Jeremiyah Love (Ari - RB)").
const draftName = (n) => String(n ?? '').replace(/\s*\([A-Za-z]{2,4} - [A-Z,/]+\)\s*$/, '');

export function buildHistory(rawSeasons, aliases = {}) {
  const who = (m) => aliases[m] ?? m;
  const seasons = rawSeasons.toSorted((a, b) => a.year - b.year).map((s) => {
    const byId = Object.fromEntries(s.teams.map((t) => [t.id, { ...t, manager: who(t.manager) }]));
    const lastWeek = Math.max(0, ...s.weeks.map((w) => w.week));
    const playoffStart = s.playoffStart || lastWeek - 2; // shortcut: assumes 3 playoff weeks when Yahoo's settings didn't say
    let games = s.weeks.flatMap((w) => w.games
      .filter((g) => g[0].points || g[1].points) // unplayed weeks show 0-0
      .map(([a, b]) => ({ year: s.year, week: w.week, playoff: w.week >= playoffStart, a: { ...byId[a.team], points: a.points }, b: { ...byId[b.team], points: b.points } })));
    const complete = games.some((g) => g.week === lastWeek);
    // An unfinished season keeps only its final weeks: through finalThrough when the collector recorded it,
    // otherwise everything but the latest week, which may still be in progress.
    if (!complete) games = games.filter((g) => g.week <= (s.finalThrough ?? Math.max(...games.map((x) => x.week)) - 1));
    const teams = Object.values(byId).toSorted((a, b) => a.rank - b.rank);
    return {
      year: s.year, platform: s.platform ?? 'yahoo', keepersKnown: !!s.keepersKnown, complete, playoffStart, teams, games,
      champion: complete ? teams.find((t) => t.rank === 1) : null,
      draft: (s.draft ?? []).map((d) => ({ ...d, player: draftName(d.player), manager: byId[d.team]?.manager, teamName: byId[d.team]?.name })),
    };
  });
  return { seasons, managers: managerTable(seasons), records: recordBook(seasons), awards: seasons.filter((s) => s.complete).map(seasonAwards) };
}

function managerTable(seasons) {
  const m = {};
  for (const s of seasons) {
    for (const t of s.teams) {
      const r = (m[t.manager] ??= { manager: t.manager, seasons: 0, wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, titles: [], finals: 0, finishes: [], teamNames: [] });
      r.seasons++; r.wins += t.wins ?? 0; r.losses += t.losses ?? 0; r.ties += t.ties ?? 0; r.pf += t.pf ?? 0; r.pa += t.pa ?? 0;
      r.teamNames.push({ year: s.year, name: t.name });
      if (s.complete) {
        r.finishes.push(t.rank);
        if (t.rank === 1) r.titles.push(s.year);
        if (t.rank <= 2) r.finals++;
      }
    }
  }
  return Object.values(m).map((r) => ({
    ...r, pf: round2(r.pf), pa: round2(r.pa),
    winPct: r.wins + r.losses + r.ties ? (r.wins + r.ties / 2) / (r.wins + r.losses + r.ties) : 0,
    avgFinish: r.finishes.length ? round2(r.finishes.reduce((a, b) => a + b, 0) / r.finishes.length) : null,
    bestFinish: r.finishes.length ? Math.min(...r.finishes) : null,
  })).toSorted((a, b) => b.titles.length - a.titles.length || b.winPct - a.winPct);
}

const side = (g, x) => ({ year: g.year, week: g.week, playoff: g.playoff, manager: x.manager, team: x.name, points: x.points });

function recordBook(seasons, top = 10) {
  const games = seasons.flatMap((s) => s.games);
  const scores = games.flatMap((g) => [side(g, g.a), side(g, g.b)]);
  const margins = games.map((g) => {
    const [w, l] = g.a.points >= g.b.points ? [g.a, g.b] : [g.b, g.a];
    return { year: g.year, week: g.week, playoff: g.playoff, winner: w.manager, winnerTeam: w.name, loser: l.manager, loserTeam: l.name, wPts: w.points, lPts: l.points, margin: round2(w.points - l.points) };
  });
  const teamSeasons = seasons.flatMap((s) => s.teams.map((t) => ({ year: s.year, manager: t.manager, team: t.name, wins: t.wins, losses: t.losses, ties: t.ties, pf: t.pf, rank: t.rank, complete: s.complete })));
  return {
    highScores: scores.toSorted((a, b) => b.points - a.points).slice(0, top),
    lowScores: scores.toSorted((a, b) => a.points - b.points).slice(0, top),
    blowouts: margins.toSorted((a, b) => b.margin - a.margin).slice(0, top),
    closest: margins.filter((m) => m.margin > 0).toSorted((a, b) => a.margin - b.margin).slice(0, top),
    shootouts: margins.map((m) => ({ ...m, total: round2(m.wPts + m.lPts) })).toSorted((a, b) => b.total - a.total).slice(0, top),
    bestRecords: teamSeasons.filter((t) => t.complete).toSorted((a, b) => b.wins - a.wins || b.pf - a.pf).slice(0, top),
    mostPoints: teamSeasons.filter((t) => t.complete).toSorted((a, b) => b.pf - a.pf).slice(0, top),
    winStreaks: streaks(seasons, true).slice(0, top),
    loseStreaks: streaks(seasons, false).slice(0, top),
  };
}

// Longest regular-season win (or losing) streaks, carried across seasons per manager.
function streaks(seasons, wins) {
  const best = []; const cur = {};
  for (const g of seasons.flatMap((s) => s.games.filter((x) => !x.playoff))) {
    for (const [me, them] of [[g.a, g.b], [g.b, g.a]]) {
      const hit = wins ? me.points > them.points : me.points < them.points;
      const c = (cur[me.manager] ??= { manager: me.manager, length: 0 });
      if (hit) { if (!c.length) c.from = `${g.year} W${g.week}`; c.length++; c.to = `${g.year} W${g.week}`; }
      else { if (c.length) best.push({ ...c }); c.length = 0; }
    }
  }
  best.push(...Object.values(cur).filter((c) => c.length).map((c) => ({ ...c, active: true })));
  return best.toSorted((a, b) => b.length - a.length);
}

export function seasonAwards(s) {
  const t = s.teams.filter((x) => x.pf != null);
  const by = (k, dir) => t.toSorted((a, b) => dir * (a[k] - b[k]))[0];
  const scores = s.games.flatMap((g) => [side(g, g.a), side(g, g.b)]);
  return {
    year: s.year, champion: s.champion,
    mostPoints: by('pf', -1), bum: by('pf', 1),
    unluckiest: by('pa', -1), luckiest: by('pa', 1),
    highScore: scores.toSorted((a, b) => b.points - a.points)[0],
  };
}

export function headToHead(history, a, b) {
  const games = history.seasons.flatMap((s) => s.games)
    .filter((g) => (g.a.manager === a && g.b.manager === b) || (g.a.manager === b && g.b.manager === a))
    .map((g) => (g.a.manager === a ? { ...g, me: g.a, them: g.b } : { ...g, me: g.b, them: g.a }));
  const w = games.filter((g) => g.me.points > g.them.points).length;
  const l = games.filter((g) => g.me.points < g.them.points).length;
  return { a, b, wins: w, losses: l, ties: games.length - w - l, games };
}
