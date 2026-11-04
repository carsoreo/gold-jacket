# Changelog

Versions follow [semantic versioning](https://semver.org).

## 2.1.1 (2026-11-04)

- Keepers worked out for a season Yahoo didn't mark (2023) follow the league's own pattern:
  - Only late-round picks qualify: rounds where at least 10% of picks were keepers in the marked seasons.
  - Each team gets at most the usual number of keepers, latest picks first.
  - Before, re-drafting your own player early counted as keeping him (Henry's round-2 Justin Fields and Keenan Allen in 2023).
- A league with no marked keeper seasons gets no guessed keepers.

## 2.1.0 (2026-11-04)

- New draft grades. Each pick is compared with what picks at that spot at that position usually score in the league. The expected points come from a curve fitted so it never rises later in the draft. A draft's grade is those differences added up, measured against every draft in league history, with no forced curve (an A is one standard deviation above the average draft). Best drafters use the same points.
- The Drafts tab has a manager dropdown: pick a manager to see their draft pick by pick, with points, expected points and value. Names in the grade list open that manager's draft.

## 2.0.3 (2026-11-04)

- A season in progress keeps every week that's final. The Yahoo history collector records it from Yahoo's "Week N Matchups" status, and Sleeper from its last scored week. Before, the latest week was always left out, even once it was final.

## 2.0.2 (2026-11-04)

- Weeks a team had no game (a playoff bye, or knocked out) no longer count toward best player games, bench points, top players or trades. A team's top "points left on the bench" was a bye week.
- Injured reserve no longer counts as points left on the bench.
- Trades are dated from the week of the trade. A player traded back to a team he'd been on before was credited from his first stint.
- Draft names drop the team and position Yahoo adds for the current season, so 2026's picks match their lineups.
- An unfinished season's table says "Standings", not "Final standings".
- The footer names the platforms the data actually came from.

## 2.0.1 (2026-11-04)

- The README's quick start has one path each for Sleeper-only, Yahoo-only and switched leagues. A test covers Yahoo-only leagues.

## 2.0.0 (2026-11-04)

- **Breaking:** `data/league.json` sets each platform's years on its own, so switching works in either direction:
  - Yahoo to Sleeper: `{ "yahoo": { "through": 2026 }, "sleeper": { "from": 2027 } }`
  - Sleeper to Yahoo: `{ "sleeper": { "through": 2024 }, "yahoo": { "from": 2025 } }`
  - The Sleeper league ID moves to `sleeper.league`.
  - Replaces `yahooThrough`, `sleeperFrom` and `sleeperLeague`.
- `npm run sleeper` also honors `sleeper.through`.
- Sleeper-only leagues are covered by tests and the README.
- Simpler README with a quick start.

## 1.2.0 (2026-11-04)

- `data/league.json` sets up a platform switch:
  - `yahooThrough` and `sleeperFrom` say which years come from which platform, and `prefer` breaks a tie.
  - `sleeperLeague` saves the league ID, and `name` sets the title.
- `npm run sleeper` stops at `sleeperFrom`, so a Sleeper league set up before the move is never collected. When there's nothing to save, it leaves existing files alone.

## 1.1.0 (2026-11-04)

- Sleeper leagues: `npm run sleeper -- <league id>` collects every season of a Sleeper league from Sleeper's public API, following each season back to the one before it. It covers history, weekly lineups and trades.
- Leagues that changed platforms: Yahoo and Sleeper seasons join into one history. Each year comes from one platform, Yahoo's copy first, and `data/managers.json` matches people across platforms.
- Sleeper's own keeper marks are used for its seasons. The same-team keeper rule no longer crosses a platform change.

## 1.0.0 (2026-11-03)

The Hall of Fame site in its own repo. Before this it lived in [move-the-chains](https://github.com/carsoreo/move-the-chains) (then called ff-discord-bot), versions v1.3.0–v1.7.0, which built and served it. This release is the same site as that repo's v1.7.0.

- Hall, Seasons, Record Book, Players, Trades, Rivalries and Drafts tabs.
- Browser collectors for history, lineups and trades.
- The build downloads Sleeper's player list itself and refreshes it weekly. Before, it read the bot's copy.
- `SITE_OUT` sets where the page is written, and `LEAGUE_NAME` sets the title.
- Hosted as a static file behind Caddy instead of being served by the bot.
