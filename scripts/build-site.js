// Builds the Hall of Fame page from the league data in data/:
//   yahoo-history.json (required), yahoo-lineups.json (player stats), yahoo-trades.json (trades),
//   managers.json (optional { "old nickname": "current nickname" } aliases).
// Writes index.html to SITE_OUT (default data/site). LEAGUE_NAME sets the title (default "The Boys").
// Usage: [SITE_OUT=/srv/hall-of-fame] [LEAGUE_NAME="The Boys"] npm run site
import fs from 'node:fs';
import { buildHistory, headToHead } from '../src/history.js';
import { playerStats, nameOnly } from '../src/players.js';
import { tradeStats } from '../src/trades.js';

const read = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const out = process.env.SITE_OUT ?? 'data/site';

const h = buildHistory(read('data/yahoo-history.json'), read('data/managers.json', {}));
const lineups = read('data/yahoo-lineups.json', {});

// Sleeper's player list gives positions for drafted players who never started. Refreshed weekly.
const PLAYERS = 'data/players.json';
if (Object.keys(lineups).length && (!fs.existsSync(PLAYERS) || Date.now() - fs.statSync(PLAYERS).mtimeMs > 7 * 864e5)) {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(PLAYERS, await res.text());
  } catch (err) {
    console.warn(`Couldn't refresh Sleeper's player list (${err.message}); using what's there.`);
  }
}
const positions = {};
for (const p of Object.values(read(PLAYERS, {}))) {
  if (!['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position)) continue;
  const n = p.position === 'DEF' ? p.last_name : p.full_name; // Yahoo calls defenses by nickname ("Patriots")
  if (n) positions[nameOnly(n)] ??= p.position;
}
const players = playerStats(h, lineups, 10, positions);
const trades = fs.existsSync('data/yahoo-trades.json') ? tradeStats(h, lineups, read('data/yahoo-trades.json')) : null;

const names = h.managers.map((m) => m.manager);
const rivalries = {};
for (const a of names) for (const b of names) if (a !== b) {
  const r = headToHead(h, a, b);
  if (r.games.length) rivalries[`${a}|${b}`] = { w: r.wins, l: r.losses, t: r.ties, games: r.games.map((g) => [g.year, g.week, g.playoff ? 1 : 0, g.me.points, g.them.points]) };
}
const data = {
  league: process.env.LEAGUE_NAME ?? 'The Boys', built: new Date().toISOString().slice(0, 10),
  managers: h.managers, records: h.records, awards: h.awards, rivalries, players, trades,
  seasons: h.seasons.map((s) => ({ year: s.year, complete: s.complete, champion: s.champion?.manager, teams: s.teams, draft: s.draft.map((d) => [d.round, d.pick, d.player, d.manager]) })),
};

fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(new URL('../site/template.html', import.meta.url), 'utf8')
  .replace('/*DATA*/null', JSON.stringify(data).replace(/</g, '\\u003c'));
fs.writeFileSync(`${out}/index.html`, html);
console.log(`Built ${out}/index.html: ${h.seasons.length} seasons, ${names.length} managers${players ? ', player stats' : ''}${trades ? ', trades' : ''}.`);
