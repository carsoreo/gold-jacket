# league-hall-of-fame

[![test](https://github.com/carsoreo/league-hall-of-fame/actions/workflows/test.yml/badge.svg)](https://github.com/carsoreo/league-hall-of-fame/actions/workflows/test.yml)

A one-page Hall of Fame for a fantasy football league, built from its Yahoo and Sleeper history, including leagues that moved from one to the other. It covers champions, records, rivalries, drafts, player stats and trades, and it's styled as a chalked football field.

Live example: https://theboysff.duckdns.org

## What's on it

| Tab | Contents | Needs |
|---|---|---|
| **Hall** | Champion banners and all-time standings | History |
| **Seasons** | Final standings and awards for each year: champion, most points, bum of the year, top week, luckiest and unluckiest | History |
| **Record Book** | Highest and lowest scores, highest-scoring games, blowouts, closest games, best seasons, win and losing streaks | History |
| **Players** | Best player games, points left on the bench, each manager's top players, the biggest steal, best and worst draft picks, best drafters | Lineups |
| **Trades** | Most lopsided trades, trade records, favorite partners, every trade by season | Trades and lineups |
| **Rivalries** | Head-to-head records for any two managers, plus a grid of every pairing | History |
| **Drafts** | Every draft board. With lineups: grades, best-value picks, keepers | History |

The page is a single self-contained HTML file with no dependencies. See [DESIGN.md](DESIGN.md) for the design system.

## Collecting your league's data

The site reads up to three kinds of data per platform, all saved in `data/`:

| Data | Used for | Required |
|---|---|---|
| History: teams, managers, final standings, weekly scores, drafts and keepers | Every tab | Yes |
| Lineups: every team's weekly lineup, with each player's slot and points | The Players tab and draft grades | No |
| Trades: every trade, with players and draft picks | The Trades tab | No |

Everything in `data/` is gitignored, so league data never ends up in the repo. No email addresses are collected.

### Sleeper

Sleeper's API is public, so one command collects everything:

```bash
npm run sleeper -- <league id>
```

Use the newest season's league ID, the number in `sleeper.com/leagues/<league id>`, or set `sleeperLeague` in [`data/league.json`](#leagues-that-changed-platforms). The script follows each season back to the one before it and saves `sleeper-history.json`, `sleeper-lineups.json` and `sleeper-trades.json`. It takes under a minute, and you can rerun it any time during a season to pick up new weeks.

### Yahoo

Yahoo's Fantasy API is closed to new apps, so its data comes from your league's own Yahoo pages, read in a browser where you're signed in:

| Script | Saves | Time |
|---|---|---|
| [`yahoo-history-browser.js`](scripts/yahoo-history-browser.js) | `yahoo-history.json` | ~10 min |
| [`yahoo-lineups-browser.js`](scripts/yahoo-lineups-browser.js) | `yahoo-lineups.json` | ~2 hours |
| [`yahoo-trades-browser.js`](scripts/yahoo-trades-browser.js) | `yahoo-trades.json` | ~1 min |

1. Find each season's league number. On your Yahoo profile, open **Fantasy → History**, open each past season of the league, and note the number in its URL (`football.fantasysports.yahoo.com/2024/f1/64015` is league `64015` in 2024).
2. Edit the `SEASONS` list at the top of the script. The lineups script also needs the number of weeks in each season.
3. Open any page on `football.fantasysports.yahoo.com` while signed in, open the developer console (F12 → **Console**), and paste the script.
4. When it's done, click the button it shows to copy the result, then paste it into the matching file in `data/`.

Options:

- **Collect only what you need.** Only the history is required; the other tabs appear once their files are in `data/`.
- **Collect fewer seasons.** Trim `SEASONS` to the years you want. You can collect more later and rerun.
- **Resume after stopping.** The history and lineup scripts save their progress in the browser. Rerunning picks up where they stopped, even after a reload.
- **Refresh during a season.** To pull new weeks, clear the saved progress in the console and rerun:
  - History: `localStorage.removeItem('__hist')`, which clears all seasons.
  - Lineups: `localStorage.removeItem('__lineups_2026')`, for one season.
- **Expect pauses.** Yahoo blocks fast reading, so the scripts read one page every few seconds. When blocked, they wait it out and continue.

### Leagues that changed platforms

A league that moved, for example from Yahoo to Sleeper, keeps one history. Collect each platform's seasons as above and the site joins them into one record book, one set of rivalries and one draft history.

- **Each season comes from one platform.** By default a year uses Yahoo's copy if there is one, otherwise Sleeper's.
- **Set the switch-over in `data/league.json`** (all optional):
  ```json
  { "name": "The Boys", "yahooThrough": 2026, "sleeperFrom": 2027, "sleeperLeague": "<league id>" }
  ```
  | Setting | Effect |
  |---|---|
  | `yahooThrough` | Last season taken from Yahoo |
  | `sleeperFrom` | First season taken from Sleeper. `npm run sleeper` also stops there, so earlier Sleeper seasons, such as a test league set up before the move, are never collected. |
  | `prefer` | `"yahoo"` (default) or `"sleeper"`: which platform wins a year both are allowed to supply |
  | `sleeperLeague` | The Sleeper league ID, so `npm run sleeper` needs no argument. Update it each season, since Sleeper gives a renewed league a new ID. |
  | `name` | League name in the title (`LEAGUE_NAME` overrides it) |

  Set these before the move and nothing from Sleeper shows up until its first real season. Then `npm run sleeper` picks it up.
- **Match people across platforms.** Sleeper usernames rarely match Yahoo nicknames, so map each Sleeper name to the name you want shown in `data/managers.json`:
  ```json
  { "carsoreo": "Carson", "henrythegreat": "Henry" }
  ```
  The same file merges a Yahoo nickname that changed between seasons, for example `{ "Jackson": "Jack" }`. Anyone left unmapped shows up as a separate manager.
- **Keepers.** Sleeper marks keepers itself, so Sleeper seasons use its marks as they are.

## Building

```bash
npm test
npm run site
```

This writes `data/site/index.html`, which opens directly in a browser. It needs Node.js 22 or newer and has no dependencies.

| Setting | Default | Purpose |
|---|---|---|
| `SITE_OUT` | `data/site` | Folder the page is written to |
| `LEAGUE_NAME` | `name` in `data/league.json`, else `The Boys` | League name in the title |

On the first build, the site downloads Sleeper's public player list and refreshes it weekly. It's used to fill in positions for drafted players who never started a game.

## How the numbers work

- **Draft value** compares each pick to his own position.
  - *Draft spot:* keepers count as claimed before the draft, so a pick's spot is the number of kept players at his position plus his order among real picks.
  - *Finish:* his rank by points among every player at that position that season.
  - *Value:* spot minus finish, so "claimed WR49, finished WR4" is +45.
  - A pick that never played counts as finishing last among the players claimed at his position.
- **Draft grades** rank managers each season by the total value of their real picks, A through F.
- **Keepers** come from Sleeper's and Yahoo's keeper marks. For Yahoo seasons with no marks, a pick is a keeper if the same manager or team ended the previous season with that player, or if it's in the usual keeper rounds and the player was on any roster.
- **Trades** are judged by the points each side's new players scored in its starting lineup for the rest of that season. Draft picks are listed but not scored.
- **Hidden points.** Yahoo sometimes hides a player's points behind a "Bye" label. When a starter is the only one hidden in a lineup, his points come from the team's score. Other hidden weeks are left out.

## Hosting

Any static web host works. The example site runs on a free Oracle Cloud server, behind a free [DuckDNS](https://www.duckdns.org) address, with [Caddy](https://caddyserver.com) serving the page and handling https:

```
# /etc/caddy/Caddyfile
yourname.duckdns.org {
	root * /srv/hall-of-fame
	file_server
	header Cache-Control no-cache
	encode gzip
}
```

To rebuild on the server after collecting new data:

```bash
cd league-hall-of-fame && git pull && SITE_OUT=/srv/hall-of-fame npm run site
```

Open ports 80 and 443 in the server's firewall and in your cloud provider's network rules.

## Related

[ff-discord-bot](https://github.com/carsoreo/ff-discord-bot) is the league's Discord and GroupMe bot, and links this site in its `#welcome` channel.

## License

[MIT](LICENSE)
