// Collects a Sleeper league's history from Sleeper's public API, following each season back to the one before it.
// Usage: npm run sleeper -- <league id>   (the newest season's league id, from sleeper.com/leagues/<id>)
// Writes data/sleeper-history.json, data/sleeper-lineups.json and data/sleeper-trades.json.
import fs from 'node:fs';
import { toSeason, toLineups, toTrades, lastWeek } from '../src/sleeper.js';
import { sleeperPlayers } from '../src/sleeper-players.js';

const API = 'https://api.sleeper.app/v1';
const get = async (path) => {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`Sleeper said HTTP ${res.status} for ${path}`);
  return res.json();
};

const start = process.argv[2] ?? process.env.SLEEPER_LEAGUE_ID;
if (!start) throw new Error('Usage: npm run sleeper -- <league id>');

const players = await sleeperPlayers({ required: true });
const history = [], lineups = {}, trades = {};
for (let id = start; id && id !== '0';) {
  const league = await get(`/league/${id}`);
  const weeks = Array.from({ length: lastWeek(league) }, (_, i) => i + 1);
  const [users, rosters, bracket, drafts] = await Promise.all([get(`/league/${id}/users`), get(`/league/${id}/rosters`), get(`/league/${id}/winners_bracket`), get(`/league/${id}/drafts`)]);
  const matchups = Object.fromEntries(await Promise.all(weeks.map(async (w) => [w, await get(`/league/${id}/matchups/${w}`)])));
  const transactions = Object.fromEntries(await Promise.all([0, ...weeks].map(async (w) => [w, await get(`/league/${id}/transactions/${w}`)])));
  const draft = drafts.find((d) => d.status === 'complete') ?? drafts[0];
  const picks = draft ? await get(`/draft/${draft.draft_id}/picks`) : [];
  const complete = league.status === 'complete';
  const season = toSeason({ league, users, rosters, matchups, bracket, picks, complete }, players);
  history.push(season);
  lineups[season.year] = toLineups({ league, matchups }, players);
  trades[season.year] = toTrades({ rosters, users, transactions }, players);
  console.log(`${season.year}: ${league.name}, ${rosters.length} teams, ${season.weeks.filter((w) => w.games.length).length} weeks, ${picks.length} picks, ${trades[season.year].length} trades${complete ? '' : ' (in progress)'}`);
  id = league.previous_league_id;
}

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/sleeper-history.json', JSON.stringify(history));
fs.writeFileSync('data/sleeper-lineups.json', JSON.stringify(lineups));
fs.writeFileSync('data/sleeper-trades.json', JSON.stringify(trades));
console.log(`Saved ${history.length} Sleeper season${history.length === 1 ? '' : 's'} to data/.`);
