// Builds the Hall of Fame page from the league data in data/:
//   yahoo-history.json and/or sleeper-history.json (at least one), plus the matching -lineups.json (player stats)
//   and -trades.json (trades), managers.json (optional { "other name": "name to show" } aliases) and league.json
//   (optional: name, yahoo/sleeper { from, through }, sleeper.league, prefer).
// Writes index.html to SITE_OUT (default data/site). LEAGUE_NAME overrides league.json's name (default "The Boys").
// Usage: [SITE_OUT=/srv/hall-of-fame] [LEAGUE_NAME="The Boys"] npm run site
import fs from 'node:fs';
import { buildHistory, headToHead } from '../src/history.js';
import { playerStats, nameOnly } from '../src/players.js';
import { tradeStats } from '../src/trades.js';
import { sleeperPlayers } from '../src/sleeper-players.js';
import { chooseSeasons, pickByYear } from '../src/sources.js';

const read = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const out = process.env.SITE_OUT ?? 'data/site';

// Seasons can come from Yahoo, Sleeper or both (a league that changed platforms); data/league.json says which
// platform covers which years (see src/sources.js). Lineups and trades follow the platform of their season.
const config = read('data/league.json', {});
const seasons = chooseSeasons({ yahoo: read('data/yahoo-history.json', []), sleeper: read('data/sleeper-history.json', []) }, config);
if (!seasons.length) throw new Error('No league data: add data/yahoo-history.json or run `npm run sleeper -- <league id>`');
const both = (name) => ({ yahoo: read(`data/yahoo-${name}.json`, {}), sleeper: read(`data/sleeper-${name}.json`, {}) });
const h = buildHistory(seasons, read('data/managers.json', {}));
const lineups = pickByYear(seasons, both('lineups'));
const tradeData = pickByYear(seasons, both('trades'));

// Sleeper's player list gives positions for drafted players who never started.
const sleeperList = Object.keys(lineups).length ? await sleeperPlayers() : {};
const positions = {};
for (const p of Object.values(sleeperList)) {
  if (!['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position)) continue;
  const n = p.position === 'DEF' ? p.last_name : p.full_name; // Yahoo calls defenses by nickname ("Patriots")
  if (n) positions[nameOnly(n)] ??= p.position;
}
const players = playerStats(h, lineups, 10, positions);
const trades = tradeStats(h, lineups, tradeData);

const names = h.managers.map((m) => m.manager);
const rivalries = {};
for (const a of names) for (const b of names) if (a !== b) {
  const r = headToHead(h, a, b);
  if (r.games.length) rivalries[`${a}|${b}`] = { w: r.wins, l: r.losses, t: r.ties, games: r.games.map((g) => [g.year, g.week, g.playoff ? 1 : 0, g.me.points, g.them.points]) };
}
const data = {
  league: process.env.LEAGUE_NAME ?? config.name ?? 'The Boys', built: new Date().toISOString().slice(0, 10),
  managers: h.managers, records: h.records, awards: h.awards, rivalries, players, trades,
  seasons: h.seasons.map((s) => ({ year: s.year, complete: s.complete, champion: s.champion?.manager, teams: s.teams, draft: s.draft.map((d) => [d.round, d.pick, d.player, d.manager]) })),
};

fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(new URL('../site/template.html', import.meta.url), 'utf8')
  .replace('/*DATA*/null', JSON.stringify(data).replace(/</g, '\\u003c'));
fs.writeFileSync(`${out}/index.html`, html);
console.log(`Built ${out}/index.html: ${h.seasons.length} season${h.seasons.length === 1 ? '' : 's'}, ${names.length} managers${players ? ', player stats' : ''}${trades ? ', trades' : ''}.`);
