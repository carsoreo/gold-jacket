# Changelog

Versions follow [semantic versioning](https://semver.org).

## 1.0.0 (2026-11-03)

The Hall of Fame site in its own repo. Before this it lived in [ff-discord-bot](https://github.com/carsoreo/ff-discord-bot), versions v1.3.0–v1.7.0, which built and served it. This release is the same site as that repo's v1.7.0.

- Hall, Seasons, Record Book, Players, Trades, Rivalries and Drafts tabs.
- Browser collectors for history, lineups and trades.
- The build downloads Sleeper's player list itself and refreshes it weekly. Before, it read the bot's copy.
- `SITE_OUT` sets where the page is written, and `LEAGUE_NAME` sets the title.
- Hosted as a static file behind Caddy instead of being served by the bot.
