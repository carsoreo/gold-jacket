import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSeason, toLineups, toTrades, lastWeek } from '../src/sleeper.js';
import { buildHistory } from '../src/history.js';
import { playerStats } from '../src/players.js';

const players = {
  10: { full_name: 'Bijan Robinson', position: 'RB' },
  20: { full_name: 'Puka Nacua', position: 'WR' },
  30: { full_name: 'Josh Allen', position: 'QB' },
  NE: { first_name: 'New England', last_name: 'Patriots', position: 'DEF' },
};
const league = { league_id: 'L1', season: '2027', settings: { playoff_week_start: 2, playoff_teams: 2 }, roster_positions: ['QB', 'RB', 'FLEX', 'DEF', 'BN'] };
const users = [{ user_id: 'u1', display_name: 'carsoreo', metadata: { team_name: 'Durham' } }, { user_id: 'u2', display_name: 'henry' }];
const rosters = [
  { roster_id: 1, owner_id: 'u1', settings: { wins: 1, losses: 0, fpts: 120, fpts_decimal: 50, fpts_against: 90 } },
  { roster_id: 2, owner_id: 'u2', settings: { wins: 0, losses: 1, fpts: 90, fpts_against: 120, fpts_against_decimal: 50 } },
];
const matchups = {
  1: [
    { roster_id: 1, matchup_id: 1, points: 120.5, starters: ['30', '10', '20', 'NE'], players: ['30', '10', '20', 'NE'], players_points: { 30: 30, 10: 40, 20: 45.5, NE: 5 } },
    { roster_id: 2, matchup_id: 1, points: 90, starters: ['0'], players: [], players_points: {} },
  ],
  2: [
    { roster_id: 1, matchup_id: 1, points: 80, custom_points: 85 },
    { roster_id: 2, matchup_id: 1, points: 100 },
  ],
};
const bracket = [{ r: 1, m: 1, p: 1, t1: 1, t2: 2, w: 2, l: 1 }];
const picks = [
  { round: 1, pick_no: 1, roster_id: 2, player_id: '10', is_keeper: true },
  { round: 1, pick_no: 2, roster_id: 1, player_id: '20', is_keeper: false },
];

test('a Sleeper season converts to the history format', () => {
  const s = toSeason({ league, users, rosters, matchups, bracket, picks, complete: true }, players);
  assert.equal(s.year, 2027);
  assert.equal(s.platform, 'sleeper');
  assert.equal(lastWeek(league), 2);
  assert.deepEqual(s.teams.map((t) => [t.id, t.name, t.manager, t.rank, t.pf, t.pa]), [[1, 'Durham', 'carsoreo', 2, 120.5, 90], [2, 'henry', 'henry', 1, 90, 120.5]]);
  assert.deepEqual(s.weeks[1].games[0], [{ team: 1, points: 85 }, { team: 2, points: 100 }]); // a commissioner's score override wins
  assert.deepEqual(s.draft, [{ round: 1, pick: 1, player: 'Bijan Robinson', team: 2, keeper: true }, { round: 1, pick: 2, player: 'Puka Nacua', team: 1, keeper: false }]);
  const h = buildHistory([s]);
  assert.equal(h.seasons[0].champion.manager, 'henry');
});

test('Sleeper lineups use the league roster slots; defenses go by nickname', () => {
  const [row] = toLineups({ league, matchups }, players);
  assert.deepEqual(row, { w: 1, t: 1, p: [['30', 'Josh Allen', 'QB', 30], ['10', 'Bijan Robinson', 'RB', 40], ['20', 'Puka Nacua', 'FLEX', 45.5], ['NE', 'Patriots', 'DEF', 5]] });
});

test('Sleeper trades list players and picks for each side', () => {
  const transactions = { 1: [{ type: 'trade', status: 'complete', status_updated: Date.UTC(2027, 9, 1, 16), roster_ids: [1, 2], adds: { 10: 1, 30: 2 }, draft_picks: [{ season: '2028', round: 2, roster_id: 2, owner_id: 1 }] }, { type: 'waiver', status: 'complete' }] };
  const [t] = toTrades({ rosters, users, transactions }, players);
  assert.deepEqual(t.sides, [
    { team: 1, players: [['Bijan Robinson', 'RB']], picks: ['2028 Round 2 (from henry)'] },
    { team: 2, players: [['Josh Allen', 'QB']], picks: [] },
  ]);
  assert.match(t.date, /^Oct 1, /);
});

test('a migrated league: Sleeper marks keepers itself and team numbers do not carry over from Yahoo', () => {
  const yahoo = { year: 2026, platform: 'yahoo', playoffStart: 2, teams: [{ id: 2, name: 'Y', manager: 'Carson', rank: 1, wins: 1, losses: 0, ties: 0, pf: 1, pa: 0 }, { id: 1, name: 'Z', manager: 'Henry', rank: 2, wins: 0, losses: 1, ties: 0, pf: 0, pa: 1 }],
    weeks: [1, 2].map((week) => ({ week, games: [[{ team: 1, points: 1 }, { team: 2, points: 2 }]] })), draft: [] };
  const sleeper = toSeason({ league, users, rosters, matchups, bracket, picks, complete: true }, players);
  // Yahoo team 2 (Carson) ended 2026 with Puka; Sleeper roster 2 is someone else, so Puka isn't a keeper for them.
  const lineups = { 2026: [{ w: 2, t: 2, p: [[1, 'Puka Nacua', 'WR', 10]] }], 2027: toLineups({ league, matchups }, players) };
  const h = buildHistory([yahoo, sleeper], { carsoreo: 'Carson', henry: 'Henry' });
  assert.deepEqual(h.managers.map((m) => m.manager).toSorted(), ['Carson', 'Henry']); // one person across both platforms
  const d = playerStats(h, lineups).drafts.bySeason[2027];
  assert.deepEqual(d.keepers, [1]); // only Sleeper's own keeper mark
});
