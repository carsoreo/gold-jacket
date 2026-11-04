// Player stats for the Hall of Fame site, from weekly Yahoo lineups:
// lineups = { [year]: [{ w: week, t: teamId, p: [[playerId, name, slot, points], …] }] }
const BENCH = new Set(['BN', 'IR']);
const name = (n) => n.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim(); // strips Yahoo's icon glyphs
const round2 = (n) => Math.round(n * 100) / 100;
// Letter grades by how far a draft's value sits from the league's average draft, in standard deviations.
const gradeFor = (z) => (z >= 1 ? 'A' : z >= 0.35 ? 'B' : z > -0.35 ? 'C' : z > -1 ? 'D' : 'F');

// positions: optional fallback { normalizedName: 'RB' } (from Sleeper's player list) for players who never started.
export function playerStats(history, lineups, top = 10, positions = {}) {
  const rows = lineupRows(history, lineups);
  if (!rows.length) return null;

  // A team with no game that week (a playoff bye, or knocked out) scored nothing, so its lineup doesn't count here.
  const played = rows.filter((r) => r.played);
  const bestGames = played.filter((r) => r.started).toSorted((a, b) => b.points - a.points).slice(0, top);

  // Bench only: injured reserve can't be started, so it isn't points "left on the bench".
  const benchWeeks = Object.values(Object.groupBy(played.filter((r) => r.slot === 'BN'), (r) => `${r.year}|${r.week}|${r.team}`))
    .map((g) => ({ year: g[0].year, week: g[0].week, manager: g[0].manager, points: round2(g.reduce((a, r) => a + r.points, 0)), best: g.toSorted((a, b) => b.points - a.points)[0] }))
    .toSorted((a, b) => b.points - a.points).slice(0, top);

  // Each manager's MVPs: most points scored in their starting lineup, all seasons.
  const mvps = Object.entries(Object.groupBy(played.filter((r) => r.started), (r) => r.manager)).map(([manager, rs]) => ({
    manager,
    players: Object.entries(Object.groupBy(rs, (r) => r.name))
      .map(([name, g]) => ({ name, points: round2(g.reduce((a, r) => a + r.points, 0)), seasons: [...new Set(g.map((r) => r.year))] }))
      .toSorted((a, b) => b.points - a.points).slice(0, 3),
  })).toSorted((a, b) => a.manager.localeCompare(b.manager));

  return { bestGames, benchWeeks, mvps, drafts: draftGrades(history, rows, top, positionOf(rows, positions)) };
}

// Every player-week in the finished weeks: { year, week, team, manager, name, slot, points, started, played }.
// played: the team had a game that week. Draft value still counts every week, since a player's points are real
// even when his fantasy team had a bye.
export function lineupRows(history, lineups) {
  const rows = [];
  for (const s of history.seasons) {
    const byId = Object.fromEntries(s.teams.map((t) => [t.id, t]));
    // Only weeks that count: the same finished weeks the scores use.
    const weeks = new Set(s.games.map((g) => g.week));
    const score = {};
    for (const g of s.games) for (const x of [g.a, g.b]) score[`${g.week}|${x.id}`] = x.points;
    const inGame = (w, t) => score[`${w}|${t}`] != null;
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
        rows.push({ year: s.year, week: w, team: t, manager: byId[t].manager, name: name(rawName), slot, points, started: !BENCH.has(slot), played: inGame(w, t) });
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
// didn't mark (2023), keepers are inferred from how the marked seasons look: only picks in the late rounds where
// keepers sit (at least 10% of those rounds' picks were keepers) qualify, when the same manager or team ended the
// season before with the player, or, in the main keeper rounds, anyone did. Each team gets at most the usual number
// of keepers, latest picks first, so re-drafting your own player in round 2 isn't mistaken for keeping him.
// Value is judged within a position. Draft spot: keepers count as claimed before the draft, so a pick's spot is the
// number of kept players at his position plus his order among real picks. Finish: his rank by points among every
// player at that position that season (kept, drafted or picked up), capped at the number of players claimed there.
// Surplus = draft spot minus finish (claimed WR46, finished WR5 = +41). Draft grades rank managers by the total
// value of their real picks: points above what that draft spot usually scores (see below).
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
  const rounds = [...new Set(marked.flatMap((s) => s.draft.map((d) => d.round)))];
  const keeperRound = Math.min(...rounds.filter((r) => share(r) >= 0.5), Infinity);
  const lateRound = Math.min(...rounds.filter((r) => share(r) >= 0.1), Infinity);
  // The usual keepers per team: the most common count in the marked seasons.
  const counts = marked.flatMap((s) => Object.values(Object.groupBy(s.draft.filter((d) => d.keeper), (d) => d.team)).map((g) => g.length));
  const perTeam = counts.length ? Number(Object.entries(Object.groupBy(counts, (c) => c)).toSorted((a, b) => b[1].length - a[1].length)[0][0]) : 0;
  const bySeason = {};
  for (const s of history.seasons) {
    if (!s.complete || !s.draft.length) continue;
    const prev = finalRoster[s.year - 1];
    // Sleeper always says which picks were keepers; so does Yahoo in the seasons it marked any.
    const marksKept = s.keepersKnown || s.draft.some((d) => d.keeper);
    // Team numbers only carry over within one platform, so the same-team rule is skipped after a migration.
    const samePlatform = history.seasons.find((x) => x.year === s.year - 1)?.platform === s.platform;
    const candidate = (d) => !!prev && d.round >= lateRound && (prev.has(`m|${d.manager}|${name(d.player)}`) || (samePlatform && prev.has(`t|${d.team}|${name(d.player)}`))
      || (d.round >= keeperRound && prev.has(`a|${name(d.player)}`)));
    const inferred = new Set();
    if (!marksKept) {
      for (const g of Object.values(Object.groupBy(s.draft.map((d, i) => ({ d, i })).filter(({ d }) => candidate(d)), ({ d }) => d.team))) {
        for (const { i } of g.toSorted((a, b) => b.i - a.i).slice(0, perTeam || g.length)) inferred.add(i);
      }
    }
    const all = s.draft.map((d, i) => ({ year: s.year, overall: i + 1, round: d.round, pick: d.pick, player: name(d.player), manager: d.manager, keeper: marksKept ? !!d.keeper : inferred.has(i), points: round2(pts[`${s.year}|${name(d.player)}`] ?? 0) }));
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
    bySeason[s.year] = { all, picks };
  }

  // Expected points for a draft spot: the league's own history of what picks claimed at that spot at that
  // position scored. It's fitted so it never rises later in the draft (isotonic regression, weighted by how many
  // picks each spot has): thin spots borrow from their neighbors, and the overall average stays the same, so an
  // average draft comes out near zero. In keeper years the first players at a position are mostly kept, which is
  // why the raw numbers are thin and bumpy there. Value = points - expected.
  const real = Object.values(bySeason).flatMap((d) => d.picks);
  const curve = {};
  for (const [pos, ps] of Object.entries(Object.groupBy(real, (p) => p.pos))) {
    const blocks = []; // pool adjacent violators: each block is { slots, sum, n }
    for (const [slot, g] of Object.entries(Object.groupBy(ps, (p) => p.posSlot)).toSorted((x, y) => x[0] - y[0])) {
      blocks.push({ slots: [Number(slot)], sum: g.reduce((a, p) => a + p.points, 0), n: g.length });
      while (blocks.length > 1 && blocks.at(-2).sum / blocks.at(-2).n < blocks.at(-1).sum / blocks.at(-1).n) {
        const last = blocks.pop(), prev = blocks.at(-1);
        prev.slots.push(...last.slots); prev.sum += last.sum; prev.n += last.n;
      }
    }
    curve[pos] = {};
    for (const b of blocks) for (const slot of b.slots) curve[pos][slot] = b.sum / b.n;
  }
  for (const p of real) { p.expected = round2(curve[p.pos][p.posSlot]); p.value = round2(p.points - p.expected); }

  // A draft is graded on its picks' total value, against every draft in league history: no forced curve.
  const drafts = Object.entries(bySeason).flatMap(([year, d]) => Object.values(Object.groupBy(d.picks, (p) => p.manager))
    .map((g) => ({ year: Number(year), manager: g[0].manager, value: round2(g.reduce((a, p) => a + p.value, 0)), points: round2(g.reduce((a, p) => a + p.points, 0)) })));
  const mean = drafts.reduce((a, t) => a + t.value, 0) / (drafts.length || 1);
  const sd = Math.sqrt(drafts.reduce((a, t) => a + (t.value - mean) ** 2, 0) / (drafts.length || 1)) || 1;
  for (const t of drafts) t.grade = gradeFor((t.value - mean) / sd);

  for (const [year, d] of Object.entries(bySeason)) {
    bySeason[year] = {
      points: Object.fromEntries(d.all.map((p) => [p.overall, p.points])),
      keepers: d.all.filter((p) => p.keeper).map((p) => p.overall),
      teams: drafts.filter((t) => t.year === Number(year)).toSorted((a, b) => b.value - a.value),
      picks: d.all.map((p) => ({ overall: p.overall, round: p.round, player: p.player, manager: p.manager, pos: p.pos, keeper: p.keeper, points: p.points, expected: p.expected ?? null, value: p.value ?? null, posSlot: p.posSlot ?? null, posRank: p.posRank ?? null })),
      steals: d.picks.filter((p) => p.points > 0).toSorted((a, b) => b.surplus - a.surplus).slice(0, 5),
      busts: d.picks.filter((p) => p.round <= 3).toSorted((a, b) => a.surplus - b.surplus).slice(0, 5),
    };
  }
  const seasons = Object.values(bySeason);
  // Best drafters: average value per draft, every graded season.
  const drafters = Object.entries(Object.groupBy(drafts, (t) => t.manager))
    .map(([manager, ts]) => ({
      manager, seasons: ts.length, value: round2(ts.reduce((a, t) => a + t.value, 0)),
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
