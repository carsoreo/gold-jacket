# gold-jacket

[![test](https://github.com/carsoreo/gold-jacket/actions/workflows/test.yml/badge.svg)](https://github.com/carsoreo/gold-jacket/actions/workflows/test.yml)

A one-page Hall of Fame for your fantasy football league. It works with **Sleeper**, **Yahoo**, or both, for leagues that switched platforms.

Example: https://theboysff.duckdns.org

## What's on it

- **Hall:** champions and all-time standings.
- **Seasons:** final standings and awards for each year.
- **Record Book:** highest and lowest scores, blowouts, closest games, streaks.
- **Players:** best player games, each manager's top players, best and worst draft picks, best drafters.
- **Trades:** most lopsided trades, trade records, every trade.
- **Rivalries:** head-to-head records between any two managers.
- **Drafts:** every draft board with grades, or one manager's draft pick by pick.

The Players and Trades tabs, and draft grades, appear once you've collected lineups and trades.

## Quick start

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
git clone https://github.com/carsoreo/gold-jacket.git
cd gold-jacket
```

Then collect your league's data and build. Pick your setup:

| Your league is on | Do this |
|---|---|
| **Sleeper only** | `npm run sleeper -- <league id>` ([details](#sleeper)) |
| **Yahoo only** | Run the Yahoo scripts in your browser ([details](#yahoo)) |
| **Both** (you switched) | Collect both, then add `data/league.json` ([details](#leagues-that-switched-platforms)) |

```bash
npm run site
```

Open `data/site/index.html` in a browser. No `data/league.json` is needed for a single-platform league.

## Collecting your data

All league data is saved in `data/`, which is never committed.

### Sleeper

```bash
npm run sleeper -- <league id>
```

The league ID is the number in your league's URL: `sleeper.com/leagues/<league id>`. Use this season's league; earlier seasons are found automatically. It takes under a minute, and you can rerun it any time to pick up new weeks.

### Yahoo

Yahoo doesn't let new apps use its API, so these scripts read your league's pages in your browser instead:

| Script | What it collects | Time |
|---|---|---|
| [`yahoo-history-browser.js`](scripts/yahoo-history-browser.js) | Standings, scores, drafts (required) | ~10 min |
| [`yahoo-lineups-browser.js`](scripts/yahoo-lineups-browser.js) | Weekly lineups (for Players and draft grades) | ~2 hours |
| [`yahoo-trades-browser.js`](scripts/yahoo-trades-browser.js) | Trades (for Trades) | ~1 min |

1. **Find your league numbers.** On your Yahoo profile, open **Fantasy → History** and open each season of your league. The number at the end of its URL is that season's league number.
2. **List your seasons** in the `SEASONS` list at the top of the script.
3. **Run the script.** Sign in to Yahoo Fantasy, press F12, open **Console**, paste the script and press Enter.
4. **Save the result.** When it finishes, click the button it shows, then paste into the file it names in `data/`.

Tips:
- Yahoo slows down fast readers, so the scripts pause between pages. Leave the tab open.
- If a script stops, run it again. It continues where it left off.

## Leagues that switched platforms

Collect both platforms as above, then tell the site which years come from where in `data/league.json`.

**Yahoo, then Sleeper** (the move happened in 2027):

```json
{
  "yahoo":   { "through": 2026 },
  "sleeper": { "from": 2027, "league": "<league id>" }
}
```

**Sleeper, then Yahoo** (the move happened in 2025):

```json
{
  "sleeper": { "through": 2024, "league": "<league id>" },
  "yahoo":   { "from": 2025 }
}
```

- `from` and `through` set the years each platform covers. Seasons outside them are ignored, so a test league you set up before switching never shows up. `npm run sleeper` skips those seasons too.
- `league` saves your Sleeper league ID, so `npm run sleeper` works without it. Sleeper gives your league a new ID every season, so update it each year.
- Without `league.json`, each year uses Yahoo if Yahoo has it, otherwise Sleeper. Add `"prefer": "sleeper"` to flip that.

**Match people across platforms.** Usernames differ between Sleeper and Yahoo, so list who's who in `data/managers.json`, with the name to show on the right:

```json
{ "carsoreo": "Carson", "henrythegreat": "Henry" }
```

Anyone left out shows up as a separate manager. The same file also merges a nickname someone changed between seasons.

## Settings

| Where | Setting | What it does |
|---|---|---|
| `data/league.json` | `name` | League name shown on the site |
| `data/league.json` | `yahoo`, `sleeper` | Years each platform covers, as above |
| `data/league.json` | `prefer` | Platform that wins a year both have |
| `data/managers.json` | | Merges names across platforms and seasons |
| Environment | `SITE_OUT` | Folder to write the page to (default `data/site`) |
| Environment | `LEAGUE_NAME` | League name, overriding `league.json` |

## How the numbers work

- **Draft value:** where a player was taken at his position versus where he finished at it. "Claimed WR49, finished WR4" is +45. Keepers count as taken before the draft.
- **Draft grades:** each pick is compared with what picks at that spot at that position have scored in your league (the 12th WR claimed, say). A draft's grade is those differences added up, measured against every draft in league history, so a strong year can have several A's and a weak one none. Keepers aren't graded.
- **Trade winners** are the side whose new players scored more for them over the rest of that season. Draft picks are listed but not scored.

## Hosting

The page is one HTML file, so any static host works. The example uses a free Oracle Cloud server, a free [DuckDNS](https://www.duckdns.org) address and [Caddy](https://caddyserver.com) for https:

```
yourname.duckdns.org {
	root * /srv/hall-of-fame
	file_server
}
```

To rebuild there: `git pull && SITE_OUT=/srv/hall-of-fame npm run site`.

## License

[MIT](LICENSE)
