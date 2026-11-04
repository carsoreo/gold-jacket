import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseSeasons, pickByYear } from '../src/sources.js';

const season = (year, tag) => ({ year, tag });
const yahoo = [season(2025, 'y'), season(2026, 'y')];
const sleeper = [season(2026, 's-test'), season(2027, 's')];

test('by default each year comes from Yahoo if it has one, otherwise Sleeper', () => {
  assert.deepEqual(chooseSeasons({ yahoo, sleeper }).map((s) => [s.year, s.tag, s.platform]), [[2025, 'y', 'yahoo'], [2026, 'y', 'yahoo'], [2027, 's', 'sleeper']]);
});

test('sleeperFrom leaves out Sleeper seasons before the switch, such as a test league', () => {
  const picked = chooseSeasons({ yahoo: [season(2025, 'y')], sleeper }, { sleeperFrom: 2027 });
  assert.deepEqual(picked.map((s) => [s.year, s.platform]), [[2025, 'yahoo'], [2027, 'sleeper']]);
});

test('yahooThrough and prefer decide who covers the overlap', () => {
  assert.deepEqual(chooseSeasons({ yahoo, sleeper }, { yahooThrough: 2025 }).map((s) => s.tag), ['y', 's-test', 's']);
  assert.deepEqual(chooseSeasons({ yahoo, sleeper }, { prefer: 'sleeper' }).map((s) => s.tag), ['y', 's-test', 's']);
});

test('lineups and trades follow the platform their season came from', () => {
  const picked = chooseSeasons({ yahoo, sleeper }, { sleeperFrom: 2027 });
  const data = { yahoo: { 2025: [1], 2026: [2] }, sleeper: { 2026: [99], 2027: [3] } };
  assert.deepEqual(pickByYear(picked, data), { 2025: [1], 2026: [2], 2027: [3] });
});
