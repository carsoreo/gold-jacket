# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
The ten managers of "The Boys", a 10-team Yahoo fantasy football league that has run since 2020 (moving to Sleeper next season), and the friends around them. They are college-age friends who talk in a GroupMe chat and a Discord server. *(Inferred: they mostly open the site on a phone from a link dropped in GroupMe or Discord, usually mid-argument.)*

## Product Purpose
The CO Fantasy Bot Hall of Fame is the league's permanent history: who won each year, all-time standings, the record book, head-to-head rivalries and every draft. It answers the questions the group chat argues about. Success: someone settles an argument with a link.

## Positioning
Built from this league's own seven seasons of real results, run by a league member. It carries the league's own in-jokes, like the bot's "BUM OF THE WEEK", instead of a generic platform's.

## Operating Context
- Opened from links in GroupMe and Discord.
- Rebuilt by `npm run site` from collected Yahoo history.
- Served as a static file by Caddy on the league bot's Oracle VM.
- Seasons run September to January. The current season shows as in progress until it finishes.

## Capabilities and Constraints
- A single self-contained HTML file in vanilla JS, with league data injected as JSON at build (`site/template.html`, built by `scripts/build-site.js`).
- Sections: Hall (champions, all-time standings), Seasons (standings and awards), Record Book, Rivalries (head-to-head and the matrix), Drafts (full boards).
- Data on hand: team names, manager nicknames, final ranks, records, points for and against, weekly scores, playoff weeks and draft picks.
- Not available: player season points, so there are no draft grades. There are no photos, logos or emails.
- 12 managers across 7 seasons, 10 teams per season.

## Brand Commitments
League name "The Boys". The bot's voice is casual, roast-friendly and emoji-light, as in "😂😂 BUM OF THE WEEK 😂😂". *(Inferred: there is no logo or palette to keep.)*

## Evidence on Hand
- Real league history in `data/yahoo-history.json` (gitignored).
- No imagery assets. Nothing fabricated: every number shown must come from the data.

## Product Principles
1. Every stat is real and traceable to a week and a season.
2. Answer the argument fast: the record, the margin, the date.
3. Honor champions, roast bums. Both are part of the league's culture.
4. Phone-first, because links get opened in chats.

## Accessibility & Inclusion
Readable contrast on phones outdoors. Tables must scroll rather than break on narrow screens.
