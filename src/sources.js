// Picks which platform each season comes from, for leagues on Yahoo, Sleeper or both (in either order).
// config (data/league.json, all optional):
//   { yahoo: { from, through }, sleeper: { from, through, league }, prefer: 'yahoo' | 'sleeper' }
// from/through limit the years a platform supplies; prefer settles a year both supply (default yahoo).
export const PLATFORMS = ['yahoo', 'sleeper'];

export const inRange = (range = {}, year) => (range.from == null || year >= range.from) && (range.through == null || year <= range.through);

export function chooseSeasons(data, config = {}) {
  const first = config.prefer === 'sleeper' ? 'sleeper' : 'yahoo';
  const byYear = {};
  for (const platform of PLATFORMS) {
    for (const s of data[platform] ?? []) {
      if (!inRange(config[platform], s.year)) continue;
      if (!byYear[s.year] || platform === first) byYear[s.year] = { ...s, platform };
    }
  }
  return Object.values(byYear).toSorted((a, b) => a.year - b.year);
}

// Lineups or trades for the chosen seasons, each year from the same platform as its season.
export function pickByYear(seasons, data) {
  return Object.fromEntries(seasons.map((s) => [s.year, data[s.platform]?.[s.year]]).filter(([, v]) => v?.length));
}
