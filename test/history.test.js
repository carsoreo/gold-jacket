import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHistory, headToHead } from '../src/history.js';

const team = (id, manager, rank, wins, losses, pf, pa) => ({ id, name: `${manager}'s team`, manager, rank, wins, losses, ties: 0, pf, pa });
const g = (a, ap, b, bp) => [{ team: a, points: ap }, { team: b, points: bp }];
const seasons = [
  { year: 2024, playoffStart: 3, teams: [team(1, 'Ann', 1, 2, 0, 300, 200), team(2, 'Bob', 2, 0, 2, 200, 300)],
    weeks: [{ week: 1, games: [g(1, 150, 2, 90)] }, { week: 2, games: [g(1, 150, 2, 110)] }, { week: 3, games: [g(2, 120, 1, 119.5)] }] },
  { year: 2025, playoffStart: 3, teams: [team(5, 'Bob', 1, 1, 0, 100, 80), team(6, 'AnnCommish', 2, 0, 1, 80, 100)],
    weeks: [{ week: 1, games: [g(5, 100, 6, 80)] }, { week: 2, games: [g(5, 0, 6, 0)] }, { week: 3, games: [g(5, 0, 6, 0)] }] },
];

test('history: titles, aliases, unfinished seasons and records', () => {
  const h = buildHistory(seasons, { AnnCommish: 'Ann' });
  const ann = h.managers.find((m) => m.manager === 'Ann');
  assert.deepEqual(ann.titles, [2024]);
  assert.equal(ann.seasons, 2);
  assert.equal(h.seasons[1].complete, false); // 0-0 weeks are unplayed
  assert.equal(h.seasons[1].champion, null);
  assert.equal(h.records.highScores[0].points, 150);
  assert.equal(h.records.closest[0].margin, 0.5);
  assert.equal(h.records.closest[0].playoff, true);
  assert.equal(h.records.blowouts[0].margin, 60);
  assert.equal(h.records.shootouts[0].total, 260); // 150 + 110
  assert.equal(h.records.winStreaks[0].length, 2); // playoff loss doesn't break a regular-season streak
  assert.equal(h.awards[0].bum.manager, 'Bob');
});

test('head to head counts every meeting from one side, skipping a week still in progress', () => {
  const r = headToHead(buildHistory(seasons, { AnnCommish: 'Ann' }), 'Bob', 'Ann');
  assert.deepEqual([r.wins, r.losses, r.ties], [1, 2, 0]); // 2025 week 1 is the unfinished season's latest week
});

test("draft names lose the team and position Yahoo adds for the current season", () => {
  const s = { ...seasons[0], draft: [{ round: 1, pick: 1, player: 'Jeremiyah Love (Ari - RB)', team: 1 }, { round: 1, pick: 2, player: 'Amon-Ra St. Brown (Det - WR)', team: 2 }] };
  assert.deepEqual(buildHistory([s]).seasons[0].draft.map((d) => d.player), ['Jeremiyah Love', 'Amon-Ra St. Brown']);
});

test('an unfinished season keeps the weeks the collector marked final', () => {
  const live = { ...seasons[1], finalThrough: 1 }; // 2025 in the fixture: week 1 played and final
  assert.deepEqual(buildHistory([live]).seasons[0].games.map((g) => g.week), [1]);
  const unknown = { ...seasons[1] };
  assert.deepEqual(buildHistory([unknown]).seasons[0].games.map((g) => g.week), []); // latest week left out
});

test('streaks carry across seasons, skip playoff games, and the latest one is still active', () => {
  const two = [
    { year: 2024, playoffStart: 3, teams: [team(1, 'Ann', 2, 1, 1, 190, 195), team(2, 'Bob', 1, 1, 1, 195, 190)],
      weeks: [{ week: 1, games: [g(1, 90, 2, 100)] }, { week: 2, games: [g(1, 100, 2, 95)] }, { week: 3, games: [g(1, 80, 2, 120)] }] },
    { year: 2025, playoffStart: 3, teams: [team(1, 'Ann', 1, 2, 0, 215, 200), team(2, 'Bob', 2, 0, 2, 200, 215)],
      weeks: [{ week: 1, games: [g(1, 110, 2, 100)] }, { week: 2, games: [g(1, 105, 2, 100)] }, { week: 3, games: [g(1, 90, 2, 90)] }] },
  ];
  const h = buildHistory(two);
  assert.deepEqual(h.records.winStreaks[0], { manager: 'Ann', length: 3, from: '2024 W2', to: '2025 W2', active: true });
  assert.deepEqual([h.records.loseStreaks[0].manager, h.records.loseStreaks[0].length], ['Bob', 3]);
  // A tie is nobody's win: it counts as a tie head to head and isn't the "closest game".
  const r = headToHead(h, 'Ann', 'Bob');
  assert.deepEqual([r.wins, r.losses, r.ties], [3, 2, 1]);
  assert.equal(h.records.closest[0].margin, 5);
});
