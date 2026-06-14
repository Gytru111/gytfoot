const SX_BASE = 'https://api.sx.bet';
const BASE_TOKEN = '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B';

type MarketHashes = { home: string | null; draw: string | null; away: string | null };

const MARKET_MAP: Record<string, MarketHashes> = {
  'Allemagne-Curaçao': {
    home: '0x1718aa587184b8e994a86a199c7b643074aa6fe950a7d2c4e7b5e50d837a3f66',
    draw: '0x5b2b75f92edb334b46d6674f1a06880b2cc314f57c4f5c3527a98c721698ea8d',
    away: '0x867389ef80bd027e508cd79c09b52abacdce70e0fcb928384c46be880524746f',
  },
  'Belgique-Iran': {
    home: '0x5d66b003db8e7ff5e38e04e60588f63cd720a345a32201441e31f7305f3c96df',
    draw: '0x00a11b04241d36dbff8436843d1152e9f3b130eabe53d1e897b4fe2a83077e7d',
    away: '0x3ac17ca9a01efb4c86c55d3f2f91e21a03f44c2ca3765d154feb656a548f08df',
  },
  'Côte d\'ivoire-Équateur': {
    home: '0xcb066082fa038c7253636985baccffcd0d591ee4ba6f99b2dec22780afe085a6',
    draw: '0xe679f40771fc2f203af9cabbd815bcbc49c98930c5f42a58fc66f1f47c350e80',
    away: '0xdfa2748c9aa3a69ed360d16ef863e511b73231e90634845dd5a0f50226a23930',
  },
  'Brésil-Maroc': {
    home: null,
    draw: '0x9877c68699d9d1436e8e99d6d0154a9ec18d9c8b03a2f96d323dd38b6be08931',
    away: '0xf9bc6f28c3d305167fad403098a93489cc429baf490ec7392ff080a80b3075a7',
  },
  'Argentine-Autriche': {
    home: null,
    draw: '0xe252261f27f07ec810668f347b39aacc88cabae50c03d9bcd7454018c92fa857',
    away: '0x5b3e30ab4491228ecc81c0555ecc3ecf1f8e9131f7b1670e41c2a41034a54e29',
  },
  'Espagne-Cap-Vert': {
    home: '0x1f06e1935d0fd01d1c1a9ad69afe31b8753ac2d1643afff102e3c10977f907c2',
    draw: '0x0d2eca11c7fe9c5008767dde7b30f92db4d3abfbb28a8ad34328923b992bf3a7',
    away: '0xf84789b14b52c2452c48c22f3fbbc5139d43e524c477b23def5e94fb63033eb6',
  },
  'Belgique-Égypte': {
    home: '0x23a4ea82c164a28f08ed1b69b54e969fa6274dccc61c63cf3480cb860b4f47a6',
    draw: null,
    away: '0x5949759530432d2d52c8ab2154c418eb6856ec8592ca02eb5c29f2d5ba494f66',
  },
  'Iran-Nouvelle-Zélande': {
    home: '0x8bc2eb731c10a6fcd19eff5aa7778d7ecfb0e65d0af8ee2e365042855c4cca01',
    draw: '0x41fe75338b8fab7f3d7933b09605ceb6bf39f7e9bb5070915ed2271dcc931cf3',
    away: '0x33d95d37684bd7c0e7b239a6544c0c53c2e8427451f3bd0f7031342e78a308b6',
  },
  'Angleterre-Croatie': {
    home: '0xf823ea9bf31ecb4f4d558271244b98b8bbb8218e1afa2cb31fdac05cef8c096e',
    draw: '0xce85164829f3ceabc665f8b50c7d87898253e013ed5a75f84665844919369a09',
    away: '0x41ede9082cc03d84b2fb28c60b34c86db83add4603b9c48e1e9f126f620ce6eb',
  },
  'Ghana-Panama': {
    home: '0xaa9b34132563798da9e6369ccae6f7506f6ebb9ff35a0d4a58bfc15d26bdcb5f',
    draw: '0xc0f6d90ac7e5e599a9d7a5d17b5ed9117a792e8aa20fc156cc2cb1d2e84f9afe',
    away: '0xb0c71a6fe4c04a4149a629e5185ed94c76ea984886efcae12882a976e416a40b',
  },
  'Portugal-RD Congo': {
    home: '0xa64700cb21bbd27958ac2b04070beb4c26524ebb5f2e1cac7729f8f48fb10ede',
    draw: '0x25253773767d0fdbb08a3a4df602596f7908f52e592b1d7c775a1be736bcc501',
    away: '0x7e2b819d66ad44951f086b0218a596ba8501d3aff62b436abf4194330fb603b1',
  },
};

async function fetchBestOdds(marketHashes: string[]): Promise<Map<string, { outcomeOne: string | null; outcomeTwo: string | null }>> {
  if (marketHashes.length === 0) return new Map();
  const url = `${SX_BASE}/orders/odds/best?marketHashes=${marketHashes.join(',')}&baseToken=${BASE_TOKEN}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`SX Bet API error: ${res.status}`);
  const json: any = await res.json();
  if (json.status !== 'success') throw new Error('SX Bet API failure');
  const result = new Map<string, { outcomeOne: string | null; outcomeTwo: string | null }>();
  for (const item of json.data.bestOdds) {
    result.set(item.marketHash, {
      outcomeOne: item.outcomeOne?.percentageOdds ?? null,
      outcomeTwo: item.outcomeTwo?.percentageOdds ?? null,
    });
  }
  return result;
}

function pctToProb(pctStr: string | null): number | null {
  if (!pctStr) return null;
  const prob = Number(pctStr) / 1e20;
  if (prob <= 0 || prob >= 1) return null;
  return prob;
}

export interface SxBetOdds {
  odds_home: number;
  odds_draw: number;
  odds_away: number;
}

function makeOdds(prob: number, margin: number): number {
  return Math.max(1.01, Math.min(50, Math.round(100 / (prob * margin)) / 100));
}

export async function fetchSxBetOdds(homeTeam: string, awayTeam: string): Promise<SxBetOdds | null> {
  const key = `${homeTeam}-${awayTeam}`;
  const hashes = MARKET_MAP[key];
  if (!hashes) return null;

  const activeHashes = [hashes.home, hashes.draw, hashes.away].filter(Boolean) as string[];
  if (activeHashes.length === 0) return null;

  let oddsMap: Map<string, { outcomeOne: string | null; outcomeTwo: string | null }>;
  try {
    oddsMap = await fetchBestOdds(activeHashes);
  } catch (e) {
    console.error(`SX Bet fetch error for ${key}:`, e);
    return null;
  }

  const pHome = hashes.home ? pctToProb(oddsMap.get(hashes.home)?.outcomeOne ?? null) : null;
  const pDraw = hashes.draw ? pctToProb(oddsMap.get(hashes.draw)?.outcomeOne ?? null) : null;
  const pAway = hashes.away ? pctToProb(oddsMap.get(hashes.away)?.outcomeOne ?? null) : null;

  const known = [pHome, pDraw, pAway].filter((p): p is number => p !== null);
  if (known.length < 2) return null;

  const knownCount = known.length;
  const total = known.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  const missingCount = 3 - knownCount;
  const missingEach = missingCount > 0 ? (1 - total) / missingCount : 0;

  const fHome = pHome ?? missingEach;
  const fDraw = pDraw ?? missingEach;
  const fAway = pAway ?? missingEach;

  const norm = fHome + fDraw + fAway;
  const nHome = fHome / norm;
  const nDraw = fDraw / norm;
  const nAway = fAway / norm;

  const margin = 1.06;
  const odds_home = makeOdds(nHome, margin);
  const odds_draw = makeOdds(nDraw, margin);
  const odds_away = makeOdds(nAway, margin);

  return { odds_home, odds_draw, odds_away };
}
