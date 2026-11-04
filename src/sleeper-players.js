// Sleeper's public player list (~15 MB), cached in data/players.json and refreshed weekly.
import fs from 'node:fs';

export const PLAYERS = 'data/players.json';

export async function sleeperPlayers({ required = false } = {}) {
  const stale = !fs.existsSync(PLAYERS) || Date.now() - fs.statSync(PLAYERS).mtimeMs > 7 * 864e5;
  if (stale) {
    try {
      const res = await fetch('https://api.sleeper.app/v1/players/nfl');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.mkdirSync('data', { recursive: true });
      fs.writeFileSync(PLAYERS, await res.text());
    } catch (err) {
      if (required && !fs.existsSync(PLAYERS)) throw new Error(`Couldn't download Sleeper's player list: ${err.message}`);
      console.warn(`Couldn't refresh Sleeper's player list (${err.message}); using what's there.`);
    }
  }
  return fs.existsSync(PLAYERS) ? JSON.parse(fs.readFileSync(PLAYERS, 'utf8')) : {};
}
