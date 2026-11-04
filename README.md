# league-hall-of-fame

[![test](https://github.com/carsoreo/league-hall-of-fame/actions/workflows/test.yml/badge.svg)](https://github.com/carsoreo/league-hall-of-fame/actions/workflows/test.yml)

A one-page Hall of Fame for a fantasy football league, built from its Yahoo history. Live for The Boys at https://theboysff.duckdns.org.

It started inside [ff-discord-bot](https://github.com/carsoreo/ff-discord-bot), the league's Discord and GroupMe bot, and moved here in November 2026. Its history before the move is that repo's v1.3.0–v1.7.0.

## What's on it

- **Hall:** champion banners and all-time standings.
- **Seasons:** final standings and awards for each year: champion, most points, bum of the year, top week, and the luckiest and unluckiest teams.
- **Record Book:** the highest and lowest scores, highest-scoring games, blowouts, closest games, best seasons, and win and losing streaks.
- **Players** (needs lineups):
  - The best player games and the most points left on the bench.
  - Each manager's top players.
  - The biggest steal ever, the best and worst draft picks, and the best drafters.
- **Trades** (needs trades): the most lopsided trades, each manager's trade record, favorite trade partners, and every trade by season.
- **Rivalries:** head-to-head records for any two managers, with a grid of every pairing.
- **Drafts:** every draft board, plus grades, best-value picks and keepers once lineups are in.

It's one self-contained HTML file, styled as a chalked football field. See [DESIGN.md](DESIGN.md).

## How the numbers work

- **Draft value** compares each pick to his own position.
  - *Draft spot:* keepers count as claimed before the draft, so a pick's spot is the kept players at his position plus his order among real picks.
  - *Finish:* his points rank against every player at that position that season, kept or picked up.
  - *Value* is spot minus finish, so "claimed WR49, finished WR4" is +45.
  - A pick that never played counts as finishing last among the players claimed at his position.
- **Keepers:** Yahoo's keeper marks where it has them. For an unmarked season, a pick is a keeper if the same manager or team ended the season before with that player, or if it's in the usual keeper rounds and the player was on any roster.
- **Trades** are judged by the points each side's new players scored in its starting lineup for the rest of that season. Draft picks are listed but not scored.
- **Hidden points:** Yahoo hides some players' points behind a "Bye" label. When a starter is the only one hidden in a lineup, his points come from the team's score.

## Getting the data

Yahoo's API is closed to new apps, so the data comes from the league's Yahoo pages, read in your signed-in browser. Each script below goes in the DevTools console on a Yahoo Fantasy tab. Set its season list first: each season's league number is on your Yahoo profile under Fantasy → History.

| Script | Saves | Takes |
|---|---|---|
| [scripts/yahoo-history-browser.js](scripts/yahoo-history-browser.js) | `data/yahoo-history.json` (standings, scores, drafts, manager nicknames; no emails) | ~10 min |
| [scripts/yahoo-lineups-browser.js](scripts/yahoo-lineups-browser.js) | `data/yahoo-lineups.json` (every team's weekly lineup) | ~2 hours |
| [scripts/yahoo-trades-browser.js](scripts/yahoo-trades-browser.js) | `data/yahoo-trades.json` | ~1 min |

Yahoo throttles fast reading, so they go one page every few seconds and wait when blocked. Everything under `data/` is gitignored, so league data never lands in this public repo.

If a manager's Yahoo nickname changed between seasons, map old to new in `data/managers.json`, for example `{ "Jackson": "Jack" }`.

## Build

```bash
npm test
npm run site
```

This writes `data/site/index.html`, which you can open directly. It needs Node 22 or newer and has no dependencies. Sleeper's player list (`data/players.json`, used to fill in positions) is downloaded on the first build and refreshed weekly.

- `SITE_OUT=/some/folder` writes the page somewhere else.
- `LEAGUE_NAME="..."` sets the title.

## Hosting

The Boys' copy runs on the same free Oracle Cloud server as the bot:

- **Address:** a free [DuckDNS](https://www.duckdns.org) name pointed at the server.
- **Web server:** [Caddy](https://caddyserver.com) serves the built page and handles https by itself:
  ```
  # /etc/caddy/Caddyfile
  theboysff.duckdns.org {
  	root * /srv/hall-of-fame
  	file_server
  	header Cache-Control no-cache
  	encode gzip
  }
  ```
- **Build on the server:**
  ```bash
  cd ~/league-hall-of-fame && git pull && SITE_OUT=/srv/hall-of-fame npm run site
  ```
- **Ports:** 80 and 443 have to be open in the Oracle security list (ingress TCP) and in the server's firewall.
