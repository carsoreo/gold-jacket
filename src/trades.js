// Trade history for the Hall of Fame site.
// trades = { [year]: [{ date, sides: [{ team, players: [[name, pos]], picks: ['Round 4 (from X)'] }] }] }
// Each side lists what that team received. A trade is judged by the points its players scored in the
// receiving team's starting lineup for the rest of that season; draft picks are listed but not scored.
import { lineupRows } from './players.js';

const round2 = (n) => Math.round(n * 100) / 100;
const clean = (n) => n.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();

// NFL week 1 kicks off the Thursday after Labor Day (the first Monday of September); fantasy weeks run Tuesday to Monday.
export function weekOf(season, date) {
  const m = /^(\w{3}) (\d+)/.exec(date ?? '');
  const month = m && ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m[1]);
  if (!m || month < 0) return 1;
  const day = Date.UTC(month < 7 ? season + 1 : season, month, Number(m[2])); // Jan-Jul belong to the season's tail
  const sep1 = new Date(Date.UTC(season, 8, 1)).getUTCDay();
  const laborDay = 1 + ((8 - sep1) % 7);
  const week1Tuesday = Date.UTC(season, 8, laborDay + 1);
  return Math.max(1, Math.floor((day - week1Tuesday) / (7 * 864e5)) + 1);
}

export function tradeStats(history, lineups, trades, top = 10) {
  if (!Object.keys(trades ?? {}).length) return null;
  const rows = lineupRows(history, lineups);
  const byKey = Object.groupBy(rows, (r) => `${r.year}|${r.team}|${r.name}`);
  const list = [];
  for (const s of history.seasons) {
    const byId = Object.fromEntries(s.teams.map((t) => [t.id, t]));
    for (const t of trades[s.year] ?? []) {
      // The trade week: the first week, from the week of the trade date on, that a traded player shows up on his
      // new team. Starting from the date matters when a player had been on that team before (a trade back).
      const from = weekOf(s.year, t.date);
      const firsts = t.sides.flatMap((side) => side.players.map(([n]) => Math.min(...(byKey[`${s.year}|${side.team}|${clean(n)}`] ?? []).map((r) => r.week).filter((w) => w >= from))));
      const week = Math.min(...firsts.filter(Number.isFinite), Infinity);
      const sides = t.sides.map((side) => ({
        manager: byId[side.team]?.manager ?? '?',
        players: side.players.map(([n, pos]) => {
          const after = (byKey[`${s.year}|${side.team}|${clean(n)}`] ?? []).filter((r) => r.week >= week && r.started);
          return { name: clean(n), pos, points: round2(after.reduce((a, r) => a + r.points, 0)) };
        }),
        picks: side.picks,
      })).map((side) => ({ ...side, points: round2(side.players.reduce((a, p) => a + p.points, 0)) }));
      const scored = Number.isFinite(week) && sides.length === 2 && sides.every((x) => x.players.length);
      const [a, b] = sides;
      const winner = scored && a.points !== b.points ? (a.points > b.points ? 0 : 1) : null;
      list.push({ year: s.year, date: t.date, week: Number.isFinite(week) ? week : null, sides, winner, margin: winner == null ? null : round2(Math.abs(a.points - b.points)) });
    }
  }

  // Per manager: trades made, record in scored trades, and net points gained.
  const managers = {};
  for (const t of list) t.sides.forEach((side, i) => {
    const m = (managers[side.manager] ??= { manager: side.manager, trades: 0, wins: 0, losses: 0, net: 0 });
    m.trades++;
    if (t.winner == null) return;
    if (t.winner === i) m.wins++; else m.losses++;
    m.net = round2(m.net + side.points - t.sides[1 - i].points);
  });
  const partners = Object.entries(Object.groupBy(list.filter((t) => t.sides.length === 2), (t) => t.sides.map((x) => x.manager).toSorted().join(' & ')))
    .map(([pair, ts]) => ({ pair, trades: ts.length })).toSorted((a, b) => b.trades - a.trades).slice(0, 5);

  return {
    trades: list.toSorted((a, b) => b.year - a.year),
    lopsided: list.filter((t) => t.winner != null).toSorted((a, b) => b.margin - a.margin).slice(0, top),
    managers: Object.values(managers).toSorted((a, b) => b.net - a.net),
    partners,
  };
}
