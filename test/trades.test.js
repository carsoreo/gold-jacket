import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHistory } from '../src/history.js';
import { tradeStats } from '../src/trades.js';

const team = (id, manager, rank) => ({ id, name: `${manager} FC`, manager, rank, wins: 1, losses: 1, ties: 0, pf: 200, pa: 200 });
const season = {
  year: 2024, playoffStart: 4, draft: [],
  teams: [team(1, 'Ann', 1), team(2, 'Bob', 2)],
  weeks: [1, 2, 3, 4].map((week) => ({ week, games: [[{ team: 1, points: 100 }, { team: 2, points: 90 }]] })),
};
// Ann trades Runner to Bob before week 3 and gets Catcher back.
const lineups = { 2024: [1, 2, 3, 4].flatMap((w) => [
  { w, t: 1, p: [[1, w < 3 ? 'Runner' : 'Catcher', 'RB', w < 3 ? 20 : 5]] },
  { w, t: 2, p: [[2, w < 3 ? 'Catcher' : 'Runner', w < 3 ? 'WR' : 'RB', w < 3 ? 5 : 20]] },
]) };
const trades = { 2024: [{ date: 'Oct 1', sides: [{ team: 1, players: [['Catcher', 'WR']], picks: ['Round 3'] }, { team: 2, players: [['Runner', 'RB']], picks: [] }] }] };

test('trades are judged by points after the trade week, and picks are listed', () => {
  const t = tradeStats(buildHistory([season]), lineups, trades);
  const [x] = t.trades;
  assert.equal(x.week, 3);
  assert.deepEqual(x.sides.map((s) => s.points), [10, 40]); // 2 weeks each after the trade
  assert.equal(x.winner, 1);
  assert.equal(x.margin, 30);
  assert.deepEqual(x.sides[0].picks, ['Round 3']);
  assert.deepEqual(t.managers.map((m) => [m.manager, m.wins, m.losses, m.net]), [['Bob', 1, 0, 30], ['Ann', 0, 1, -30]]);
  assert.equal(t.partners[0].pair, 'Ann & Bob');
});

test('no trade history means no trade stats', () => {
  assert.equal(tradeStats(buildHistory([season]), lineups, {}), null);
});
