// Converts Sleeper's public API data into the same shapes the Yahoo collectors save, so the site treats both alike.
// Inputs are the API responses for one season: league, users, rosters, matchups by week, winners_bracket,
// draft picks and transactions by week, plus Sleeper's player list ({ id: { full_name, last_name, position } }).

const DEF_NAME = (p) => p?.last_name; // Sleeper defenses are "New England Patriots"; Yahoo calls them "Patriots"
export const playerName = (players, id) => {
  const p = players[id];
  if (!p) return String(id);
  return p.position === 'DEF' ? DEF_NAME(p) ?? String(id) : p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
};
const num = (whole, dec) => Math.round(((whole ?? 0) + (dec ?? 0) / 100) * 100) / 100;

// The season's last week: playoffs start at playoff_week_start and take one week per bracket round.
// shortcut: assumes one-week playoff rounds; leagues with two-week championships end a week later.
export const lastWeek = (league) => {
  const start = league.settings?.playoff_week_start || 15;
  const rounds = Math.ceil(Math.log2(Math.max(2, league.settings?.playoff_teams || 2)));
  return start + rounds - 1;
};

// Final finish: placement games in the winners bracket set the top spots (p=1 is the final, p=3 third place...);
// everyone else follows in regular-season order.
function finishes(rosters, bracket, complete) {
  const standing = rosters.toSorted((a, b) => (b.settings?.wins ?? 0) - (a.settings?.wins ?? 0) || num(b.settings?.fpts, b.settings?.fpts_decimal) - num(a.settings?.fpts, a.settings?.fpts_decimal))
    .map((r) => r.roster_id);
  const placed = [];
  if (complete) for (const g of (bracket ?? []).filter((x) => x.p && x.w && x.l).toSorted((a, b) => a.p - b.p)) placed.push([g.p, g.w], [g.p + 1, g.l]);
  const rank = Object.fromEntries(placed.map(([p, rid]) => [rid, p]));
  let next = Math.max(0, ...placed.map(([p]) => p)) + 1;
  for (const rid of standing) rank[rid] ??= next++;
  return rank;
}

export function toSeason({ league, users, rosters, matchups, bracket, picks, complete }, players) {
  const user = Object.fromEntries(users.map((u) => [u.user_id, u]));
  const rank = finishes(rosters, bracket, complete);
  const teams = rosters.map((r) => {
    const u = user[r.owner_id];
    return {
      id: r.roster_id,
      name: u?.metadata?.team_name || u?.display_name || `Team ${r.roster_id}`,
      manager: u?.display_name ?? `Team ${r.roster_id}`,
      rank: rank[r.roster_id],
      wins: r.settings?.wins ?? 0, losses: r.settings?.losses ?? 0, ties: r.settings?.ties ?? 0,
      pf: num(r.settings?.fpts, r.settings?.fpts_decimal), pa: num(r.settings?.fpts_against, r.settings?.fpts_against_decimal),
    };
  });
  const weeks = [];
  for (let w = 1; w <= lastWeek(league); w++) {
    const games = Object.values(Object.groupBy((matchups[w] ?? []).filter((m) => m.matchup_id), (m) => m.matchup_id))
      .filter((g) => g.length === 2)
      .map((g) => g.map((m) => ({ team: m.roster_id, points: m.custom_points ?? m.points ?? 0 })));
    weeks.push({ week: w, games });
  }
  const size = rosters.length;
  return {
    year: Number(league.season), leagueId: league.league_id, platform: 'sleeper', keepersKnown: true, teams, weeks,
    playoffStart: league.settings?.playoff_week_start, playoffTeams: league.settings?.playoff_teams,
    draft: (picks ?? []).toSorted((a, b) => a.pick_no - b.pick_no).map((p) => ({
      round: p.round, pick: ((p.pick_no - 1) % size) + 1, player: playerName(players, p.player_id), team: p.roster_id, keeper: !!p.is_keeper,
    })),
  };
}

// Weekly lineups in the Yahoo collector's shape: [{ w, t, p: [[playerId, name, slot, points]] }].
export function toLineups({ league, matchups }, players) {
  const slots = (league.roster_positions ?? []).filter((s) => s !== 'BN' && s !== 'IR');
  const out = [];
  for (const [w, ms] of Object.entries(matchups)) for (const m of ms) {
    if (!m.players?.length) continue;
    const starters = (m.starters ?? []);
    const reserve = new Set(m.reserve ?? []);
    const p = [];
    starters.forEach((id, i) => { if (id && id !== '0') p.push([id, playerName(players, id), slots[i] ?? 'FLEX', m.players_points?.[id] ?? 0]); });
    for (const id of m.players) if (!starters.includes(id)) p.push([id, playerName(players, id), reserve.has(id) ? 'IR' : 'BN', m.players_points?.[id] ?? 0]);
    out.push({ w: Number(w), t: m.roster_id, p });
  }
  return out;
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

// Trades in the Yahoo collector's shape: [{ date, sides: [{ team, players: [[name, pos]], picks: ['Round 2 (from X)'] }] }].
export function toTrades({ rosters, users, transactions }, players) {
  const user = Object.fromEntries(users.map((u) => [u.user_id, u]));
  const teamName = (rid) => { const r = rosters.find((x) => x.roster_id === rid); const u = user[r?.owner_id]; return u?.metadata?.team_name || u?.display_name || `Team ${rid}`; };
  return Object.values(transactions).flat()
    .filter((t) => t.type === 'trade' && t.status === 'complete')
    .toSorted((a, b) => b.status_updated - a.status_updated)
    .map((t) => ({
      date: DATE.format(new Date(t.status_updated ?? t.created)).replace(' AM', ' am').replace(' PM', ' pm'),
      sides: t.roster_ids.map((rid) => ({
        team: rid,
        players: Object.entries(t.adds ?? {}).filter(([, r]) => r === rid).map(([id]) => [playerName(players, id), players[id]?.position ?? null]),
        picks: (t.draft_picks ?? []).filter((d) => d.owner_id === rid)
          .map((d) => `${d.season} Round ${d.round}${d.roster_id !== rid ? ` (from ${teamName(d.roster_id)})` : ''}`),
      })),
    }));
}
