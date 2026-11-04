// Picks which platform each season comes from, for leagues on Yahoo, Sleeper or both.
// config (data/league.json, all optional):
//   yahooThrough: last season taken from Yahoo          sleeperFrom: first season taken from Sleeper
//   prefer: 'yahoo' | 'sleeper', which wins a year both platforms are allowed to supply (default 'yahoo')
export function chooseSeasons({ yahoo = [], sleeper = [] }, config = {}) {
  const ok = {
    yahoo: (y) => config.yahooThrough == null || y <= config.yahooThrough,
    sleeper: (y) => config.sleeperFrom == null || y >= config.sleeperFrom,
  };
  const all = [...yahoo.map((s) => ({ ...s, platform: 'yahoo' })), ...sleeper.map((s) => ({ ...s, platform: 'sleeper' }))]
    .filter((s) => ok[s.platform](s.year));
  const first = config.prefer === 'sleeper' ? 'sleeper' : 'yahoo';
  const byYear = {};
  for (const s of all) if (!byYear[s.year] || s.platform === first) byYear[s.year] = s;
  return Object.values(byYear).toSorted((a, b) => a.year - b.year);
}

// Lineups or trades for the chosen seasons, each year from the same platform as its season.
export function pickByYear(seasons, data) {
  return Object.fromEntries(seasons.map((s) => [s.year, data[s.platform]?.[s.year]]).filter(([, v]) => v?.length));
}
