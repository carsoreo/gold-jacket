// Player stats for the Hall of Fame site, from weekly Yahoo lineups:
// lineups = { [year]: [{ w: week, t: teamId, p: [[playerId, name, slot, points], …] }] }
const BENCH = new Set(['BN', 'IR']);
const name = (n) => n.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim(); // strips Yahoo's icon glyphs
const round2 = (n) => Math.round(n * 100) / 100;
const GRADES = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'F', 'F'];

// positions: optional fallback { normalizedName: 'RB' } (from Sleeper's player list) for players who never started.
export function playerStats(history, lineups, top = 10, positions = {}) {
  const rows = lineupRows(history, lineups);
  if (!rows.length) return null;

  const bestGames = rows.filter((r) => r.started).toSorted((a, b) => b.points - a.points).slice(0, top);

  const benchWeeks = Object.values(Object.groupBy(rows.filter((r) => !r.started), (r) => `${r.year}|${r.week}|${r.team}`))
    .map((g) => ({ year: g[0].year, week: g[0].week, manager: g[0].manager, points: round2(g.reduce((a, r) => a + r.points, 0)), best: g.toSorted((a, b) => b.points - a.points)[0] }))
    .toSorted((a, b) => b.points - a.points).slice(0, top);

  // Each manager's MVPs: most points scored in their starting lineup, all seasons.
  const mvps = Object.entries(Object.groupBy(rows.filter((r) => r.started), (r) => r.manager)).map(([manager, rs]) => ({
    manager,
    players: Object.entries(Object.groupBy(rs, (r) => r.name))
      .map(([name, g]) => ({ name, points: round2(g.reduce((a, r) => a + r.points, 0)), seasons: [...new Set(g.map((r) => r.year))] }))
      .toSorted((a, b) => b.points - a.points).slice(0, 3),
  })).toSorted((a, b) => a.manager.localeCompare(b.manager));

  return { bestGames, benchWeeks, mvps, drafts: draftGrades(history, rows, top, positionOf(rows, positions)) };
}

// Every player-week in the finished weeks: { year, week, team, manager, name, slot, points, started }.
export function lineupRows(history, lineups) {
  const rows = [];
  for (const s of history.seasons) {
    const byId = Object.fromEntries(s.teams.map((t) => [t.id, t]));
    // Only weeks that count: the same finished weeks the scores use.
    const weeks = new Set(s.games.map((g) => g.week));
    const score = {};
    for (const g of s.games) for (const x of [g.a, g.b]) score[`${g.week}|${x.id}`] = x.points;
    for (const { w, t, p } of lineups[s.year] ?? []) {
      if (!weeks.has(w) || !byId[t]) continue;
      // Yahoo hides some players' points behind a "Bye" label (null here). When one starter is the only unknown,
      // the team's score gives his points exactly; any other unknown counts as 0.
      const unknown = p.filter(([, , slot, pts]) => pts == null && !BENCH.has(slot));
      const known = p.reduce((a, [, , slot, pts]) => a + (BENCH.has(slot) ? 0 : pts ?? 0), 0);
      const fill = unknown.length === 1 && score[`${w}|${t}`] != null ? round2(score[`${w}|${t}`] - known) : null;
      for (const row of p) {
        const [, rawName, slot, pts] = row;
        const points = pts ?? (row === unknown[0] && fill != null ? fill : 0);
        rows.push({ year: s.year, week: w, team: t, manager: byId[t].manager, name: name(rawName), slot, points, started: !BENCH.has(slot) });
      }
    }
  }
  return rows;
}

export const nameOnly = (n) => n.toLowerCase().replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '').replace(/[^a-z]/g, '');
const FIXED = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

// A player's position: where he was started most (flex starts don't say), else the fallback list, else FLEX if he
// only ever started at flex.
function positionOf(rows, positions) {
  const count = {};
  for (const r of rows) if (r.started) (count[r.name] ??= {})[r.slot] = (count[r.name]?.[r.slot] ?? 0) + 1;
  return (n) => {
    const c = count[n] ?? {};
    const best = FIXED.filter((p) => c[p]).toSorted((a, b) => c[b] - c[a])[0];
    return best ?? positions[nameOnly(n)] ?? (c['W/R/T'] ? 'FLEX' : 'UNK');
  };
}

// Draft value: points the player scored that season on any roster (bench included), so a pick traded away still counts.
// Keepers aren't real picks, so they're left out. Where Yahoo marked keepers, its marks are used. For a season it
// didn't mark (2023), a pick is a keeper if the same manager or team ended the season before with that player, or
// if it falls in the keeper rounds (where most marked keepers sit) and the player was on any roster at the end.
// Value is judged within a position. Draft spot: keepers count as claimed before the draft, so a pick's spot is the
// number of kept players at his position plus his order among real picks. Finish: his rank by points among every
// player at that position that season (kept, drafted or picked up), capped at the number of players claimed there.
// Surplus = draft spot minus finish (claimed WR46, finished WR5 = +41). Draft grades rank managers by the total
// surplus of their real picks.
function draftGrades(history, rows, top, posOf) {
  const pts = {};
  for (const r of rows) pts[`${r.year}|${r.name}`] = (pts[`${r.year}|${r.name}`] ?? 0) + r.points;
  const finalRoster = {};
  for (const [year, rs] of Object.entries(Object.groupBy(rows, (r) => r.year))) {
    const last = Math.max(...rs.map((r) => r.week));
    finalRoster[year] = new Set(rs.filter((r) => r.week === last).flatMap((r) => [`m|${r.manager}|${r.name}`, `t|${r.team}|${r.name}`, `a|${r.name}`]));
  }
  const marked = history.seasons.filter((s) => s.draft.some((d) => d.keeper));
  const share = (r) => { const p = marked.flatMap((s) => s.draft.filter((d) => d.round === r)); return p.length ? p.filter((d) => d.keeper).length / p.length : 0; };
  const keeperRound = Math.min(...[...new Set(marked.flatMap((s) => s.draft.map((d) => d.round)))].filter((r) => share(r) >= 0.5), Infinity);
  const bySeason = {};
  for (const s of history.seasons) {
    if (!s.complete || !s.draft.length) continue;
    const prev = finalRoster[s.year - 1];
    const yahooMarked = s.draft.some((d) => d.keeper);
    const kept = (d) => yahooMarked ? d.keeper : !!prev && (prev.has(`m|${d.manager}|${name(d.player)}`) || prev.has(`t|${d.team}|${name(d.player)}`)
      || (d.round >= keeperRound && prev.has(`a|${name(d.player)}`)));
    const all = s.draft.map((d, i) => ({ year: s.year, overall: i + 1, round: d.round, pick: d.pick, player: name(d.player), manager: d.manager, keeper: kept(d), points: round2(pts[`${s.year}|${name(d.player)}`] ?? 0) }));
    const picks = all.filter((p) => !p.keeper);
    for (const p of all) p.pos = posOf(p.player);
    // Finish ranks among everyone who played that position this season.
    const finish = {};
    const season = Object.keys(pts).filter((k) => k.startsWith(`${s.year}|`)).map((k) => ({ player: k.slice(5), points: pts[k] }));
    for (const group of Object.values(Object.groupBy(season, (p) => posOf(p.player)))) {
      group.toSorted((a, b) => b.points - a.points).forEach((p, i) => { finish[p.player] = i + 1; });
    }
    const keptAt = Object.groupBy(all.filter((p) => p.keeper), (p) => p.pos);
    const claimedAt = Object.groupBy(all, (p) => p.pos);
    for (const group of Object.values(Object.groupBy(picks, (p) => p.pos))) {
      group.forEach((p, i) => {
        p.posSlot = (keptAt[p.pos]?.length ?? 0) + i + 1;
        p.posRank = finish[p.player] ?? null; // null: never on a roster
        // A dud counts as finishing last among the players claimed at his position, so a late flier that never
        // played costs little and an early bust costs a lot.
        p.surplus = p.posSlot - Math.min(p.posRank ?? Infinity, claimedAt[p.pos].length);
      });
    }
    const teams = Object.values(Object.groupBy(picks, (p) => p.manager))
      .map((g) => ({ manager: g[0].manager, value: g.reduce((a, p) => a + p.surplus, 0), points: round2(g.reduce((a, p) => a + p.points, 0)) }))
      .toSorted((a, b) => b.value - a.value || b.points - a.points).map((t, i, list) => ({ ...t, grade: GRADES[Math.floor((i * GRADES.length) / list.length)] }));
    bySeason[s.year] = {
      points: Object.fromEntries(all.map((p) => [p.overall, p.points])),
      keepers: all.filter((p) => p.keeper).map((p) => p.overall),
      teams,
      steals: picks.filter((p) => p.points > 0).toSorted((a, b) => b.surplus - a.surplus).slice(0, 5),
      busts: picks.filter((p) => p.round <= 3).toSorted((a, b) => a.surplus - b.surplus).slice(0, 5),
    };
  }
  const seasons = Object.values(bySeason);
  // Best drafters: every graded season added up.
  const drafters = Object.entries(Object.groupBy(Object.entries(bySeason).flatMap(([year, d]) => d.teams.map((t) => ({ ...t, year: Number(year) }))), (t) => t.manager))
    .map(([manager, ts]) => ({
      manager, seasons: ts.length, value: ts.reduce((a, t) => a + t.value, 0),
      grades: ts.toSorted((a, b) => a.year - b.year).map((t) => t.grade).join(''),
      best: ts.toSorted((a, b) => b.value - a.value)[0],
    }))
    .map((d) => ({ ...d, perSeason: Math.round(d.value / d.seasons) }))
    .toSorted((a, b) => b.perSeason - a.perSeason);
  return {
    bySeason, drafters,
    steals: seasons.flatMap((s) => s.steals).toSorted((a, b) => b.surplus - a.surplus).slice(0, top),
    busts: seasons.flatMap((s) => s.busts).toSorted((a, b) => a.surplus - b.surplus).slice(0, top),
  };
}
