// End to end: runs the real build script on a small league in a temp folder and checks the page it writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const script = new URL('../scripts/build-site.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const team = (id, manager, rank) => ({ id, name: `${manager} FC`, manager, rank, wins: 1, losses: 1, ties: 0, pf: 200, pa: 200 });
const season = (year, games) => ({
  year, leagueId: String(year), playoffStart: 3, teams: [team(1, 'Ann', 1), team(2, 'Bob', 2)],
  weeks: [1, 2, 3].map((week) => ({ week, games: week <= games ? [[{ team: 1, points: 100 + week }, { team: 2, points: 90 }]] : [[{ team: 1, points: 0 }, { team: 2, points: 0 }]] })),
  draft: [{ round: 1, pick: 1, player: 'Kept Guy', team: 1, keeper: true }, { round: 1, pick: 2, player: 'Missed Mark', team: 2 }],
});

function build(files, env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hof-'));
  try {
    fs.mkdirSync(path.join(dir, 'data'));
    for (const [name, json] of Object.entries(files)) fs.writeFileSync(path.join(dir, 'data', name), JSON.stringify(json));
    const run = spawnSync(process.execPath, [script], { cwd: dir, env: { ...process.env, ...env }, encoding: 'utf8' });
    if (run.status !== 0) throw new Error(run.stderr);
    const html = fs.readFileSync(path.join(dir, 'data/site/index.html'), 'utf8');
    return { out: run.stdout, warnings: run.stderr, html, data: JSON.parse(html.match(/const D = (.*);\n/)[1]) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('the build writes one page with the league data and a script that parses', () => {
  const { out, warnings, html, data } = build({
    'yahoo-history.json': [season(2025, 3), season(2026, 2)],
    'league.json': { name: 'Test League' },
    'keepers.json': { 2025: ['Missed Mark', 'Not Drafted'] },
  });
  assert.match(out, /2 seasons, 2 managers/);
  assert.match(warnings, /keepers.json: no pick named 2025 Not Drafted/);
  assert.equal(data.league, 'Test League');
  assert.deepEqual(data.platforms, ['Yahoo']);
  assert.equal(data.players, null); // no lineups collected
  assert.equal(data.seasons.find((s) => s.year === 2025).champion, 'Ann');
  // Keeper marks reach the draft board, including the season still in progress and keepers.json fixes.
  assert.deepEqual(data.seasons.map((s) => s.draft.map((d) => d[4])), [[1, 1], [1, 0]]);
  assert.doesNotMatch(html, /\/\*DATA\*\/null/);
  for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new vm.Script(code));
});

test('LEAGUE_NAME overrides the name, and a league with no data fails clearly', () => {
  assert.equal(build({ 'yahoo-history.json': [season(2025, 3)] }, { LEAGUE_NAME: 'Override' }).data.league, 'Override');
  assert.throws(() => build({}), /No league data/);
});

test("text from the data can't break out of the page's script", () => {
  const s = season(2025, 3);
  s.teams[0].name = '</script><script>alert(1)</script>';
  const { html, data } = build({ 'yahoo-history.json': [s] });
  assert.equal(html.match(/<\/script>/g).length, 1);
  assert.equal(data.seasons[0].teams[0].name, s.teams[0].name);
});
