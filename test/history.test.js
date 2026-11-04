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
