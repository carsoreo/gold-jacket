import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseSeasons, pickByYear, inRange } from '../src/sources.js';
import { buildHistory } from '../src/history.js';

const season = (year, tag) => ({ year, tag });
const years = (picked) => picked.map((s) => `${s.year} ${s.platform}`);

test('by default each year comes from Yahoo if it has one, otherwise Sleeper', () => {
  const picked = chooseSeasons({ yahoo: [season(2025), season(2026)], sleeper: [season(2026), season(2027)] });
  assert.deepEqual(years(picked), ['2025 yahoo', '2026 yahoo', '2027 sleeper']);
});

test('Yahoo to Sleeper: a Sleeper test league from before the move is left out', () => {
  const picked = chooseSeasons({ yahoo: [season(2025), season(2026)], sleeper: [season(2026, 'test'), season(2027)] }, { yahoo: { through: 2026 }, sleeper: { from: 2027 } });
  assert.deepEqual(years(picked), ['2025 yahoo', '2026 yahoo', '2027 sleeper']);
});

test('Sleeper to Yahoo works the same way', () => {
  const picked = chooseSeasons({ sleeper: [season(2023), season(2024), season(2025, 'test')], yahoo: [season(2025), season(2026)] }, { sleeper: { through: 2024 }, yahoo: { from: 2025 } });
  assert.deepEqual(years(picked), ['2023 sleeper', '2024 sleeper', '2025 yahoo', '2026 yahoo']);
});

test('prefer picks the platform for a year both supply', () => {
  const data = { yahoo: [season(2026, 'y')], sleeper: [season(2026, 's')] };
  assert.equal(chooseSeasons(data)[0].tag, 'y');
  assert.equal(chooseSeasons(data, { prefer: 'sleeper' })[0].tag, 's');
});

test('a Sleeper-only league builds without any Yahoo data', () => {
  const s = { year: 2027, teams: [{ id: 1, name: 'A', manager: 'ann', rank: 1, wins: 1, losses: 0, ties: 0, pf: 10, pa: 5 }, { id: 2, name: 'B', manager: 'bob', rank: 2, wins: 0, losses: 1, ties: 0, pf: 5, pa: 10 }],
    weeks: [{ week: 1, games: [[{ team: 1, points: 10 }, { team: 2, points: 5 }]] }], draft: [], playoffStart: 2 };
  const picked = chooseSeasons({ sleeper: [s] });
  assert.deepEqual(years(picked), ['2027 sleeper']);
  assert.equal(buildHistory(picked).seasons[0].champion.manager, 'ann');
});

test('a Yahoo-only league needs no league.json', () => {
  const picked = chooseSeasons({ yahoo: [season(2020), season(2021)] });
  assert.deepEqual(years(picked), ['2020 yahoo', '2021 yahoo']);
  assert.deepEqual(pickByYear(picked, { yahoo: { 2020: [1], 2021: [2] }, sleeper: {} }), { 2020: [1], 2021: [2] });
});

test('lineups and trades follow the platform their season came from', () => {
  const picked = chooseSeasons({ yahoo: [season(2025), season(2026)], sleeper: [season(2026), season(2027)] }, { sleeper: { from: 2027 } });
  const data = { yahoo: { 2025: [1], 2026: [2] }, sleeper: { 2026: [99], 2027: [3] } };
  assert.deepEqual(pickByYear(picked, data), { 2025: [1], 2026: [2], 2027: [3] });
});

test('ranges are inclusive and open-ended when unset', () => {
  assert.ok(inRange(undefined, 1999));
  assert.ok(inRange({ from: 2027 }, 2027) && !inRange({ from: 2027 }, 2026));
  assert.ok(inRange({ through: 2026 }, 2026) && !inRange({ through: 2026 }, 2027));
});
