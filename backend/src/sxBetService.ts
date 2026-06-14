const SX_BASE = 'https://api.sx.bet';
const BASE_TOKEN = '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B';

const FR_EN: Record<string, string[]> = {
  'Mexique': ['Mexico'],
  'Corée du Sud': ['Korea Republic', 'South Korea'],
  'République tchèque': ['Czech Republic'],
  'Canada': ['Canada'],
  'Bosnie-herzégovine': ['Bosnia-Herzegovina', 'Bosnia-Herz'],
  'USA': ['USA'],
  'Paraguay': ['Paraguay'],
  'Qatar': ['Qatar'],
  'Suisse': ['Switzerland'],
  'Brésil': ['Brazil'],
  'Maroc': ['Morocco'],
  'Haïti': ['Haiti'],
  'Écosse': ['Scotland'],
  'Australie': ['Australia'],
  'Turquie': ['Turkey'],
  'Allemagne': ['Germany'],
  'Curaçao': ['Curacao'],
  'Pays-Bas': ['Netherlands'],
  'Japon': ['Japan'],
  'Côte d\'ivoire': ["Côte d'Ivoire", 'Ivory Coast'],
  'Équateur': ['Ecuador'],
  'Suède': ['Sweden'],
  'Tunisie': ['Tunisia'],
  'Espagne': ['Spain'],
  'Cap-Vert': ['Cape Verde'],
  'Belgique': ['Belgium'],
  'Égypte': ['Egypt'],
  'Arabie Saoudite': ['Saudi Arabia'],
  'Uruguay': ['Uruguay'],
  'Iran': ['Iran'],
  'Nouvelle-Zélande': ['New Zealand'],
  'France': ['France'],
  'Sénégal': ['Senegal'],
  'Irak': ['Iraq'],
  'Argentine': ['Argentina'],
  'Algérie': ['Algeria'],
  'Autriche': ['Austria'],
  'Jordanie': ['Jordan'],
  'Portugal': ['Portugal'],
  'RD Congo': ['Congo DR', 'DR Congo'],
  'Angleterre': ['England'],
  'Croatie': ['Croatia'],
  'Ghana': ['Ghana'],
  'Panama': ['Panama'],
  'Ouzbékistan': ['Uzbekistan'],
  'Colombie': ['Colombia'],
  'Norvège': ['Norway'],
  'Afrique du Sud': ['South Africa'],
};

const teamMatches = (fr: string, en: string) => (FR_EN[fr] ?? [fr]).some(n => en.toLowerCase().includes(n.toLowerCase()));

interface SxEvent {
  eventId: string;
  teamOne: string;
  teamTwo: string;
  mHashes: Map<string, string>;
}

let cached: SxEvent[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 120_000;

async function fetchAllEvents(): Promise<SxEvent[]> {
  const now = Date.now();
  if (cached && now - lastFetch < CACHE_TTL) return cached;
  const res = await fetch(`${SX_BASE}/markets/active?sportIds=5&limit=500`, { signal: AbortSignal.timeout(15000) });
  const j: any = await res.json();
  if (j.status !== 'success') throw new Error('SX markets fail');
  const entries: any[] = j.data.markets ?? j.data ?? [];
  const map = new Map<string, SxEvent>();
  for (const m of entries) {
    if (m.type !== 1) continue;
    const eid = m.sportXeventId;
    if (!eid) continue;
    if (!map.has(eid)) map.set(eid, { eventId: eid, teamOne: m.teamOneName, teamTwo: m.teamTwoName, mHashes: new Map() });
    map.get(eid)!.mHashes.set(m.outcomeOneName, m.marketHash);
  }
  cached = Array.from(map.values()).filter(e => e.mHashes.size >= 2);
  lastFetch = Date.now();
  return cached;
}

export interface SxBetOdds { odds_home: number; odds_draw: number; odds_away: number; }

function pct(p: string | null): number | null {
  if (!p) return null;
  const v = Number(p) / 1e20;
  return (v > 0 && v < 1) ? v : null;
}

export async function fetchSxBetOdds(home: string, away: string): Promise<SxBetOdds | null> {
  try {
    const events = await fetchAllEvents();
    let match: SxEvent | null = null;
    let swapped = false;
    for (const e of events) {
      const h1 = teamMatches(home, e.teamOne);
      const a2 = teamMatches(away, e.teamTwo);
      const h2 = teamMatches(home, e.teamTwo);
      const a1 = teamMatches(away, e.teamOne);
      if (h1 && a2) { match = e; break; }
      if (h2 && a1) { match = e; swapped = true; break; }
    }
    if (!match) return null;

    const hashes = Array.from(match.mHashes.values());
    const r = await fetch(`${SX_BASE}/orders/odds/best?marketHashes=${hashes.join(',')}&baseToken=${BASE_TOKEN}`, { signal: AbortSignal.timeout(10000) });
    const j: any = await r.json();
    if (j.status !== 'success') return null;

    const odds = new Map<string, string | null>();
    for (const item of j.data.bestOdds) odds.set(item.marketHash, item.outcomeOne?.percentageOdds ?? null);

    const t1 = pct(match.mHashes.has(match.teamOne) ? odds.get(match.mHashes.get(match.teamOne)!) ?? null : null);
    const t2 = pct(match.mHashes.has(match.teamTwo) ? odds.get(match.mHashes.get(match.teamTwo)!) ?? null : null);
    const tie = pct(match.mHashes.has('Tie') ? odds.get(match.mHashes.get('Tie')!) ?? null : null);

    const pHome = swapped ? t2 : t1;
    const pAway = swapped ? t1 : t2;

    const known = [pHome, tie, pAway].filter((p): p is number => p !== null);
    if (known.length < 2) return null;
    const total = known.reduce((s, p) => s + p, 0);
    if (total <= 0) return null;
    const fill = (3 - known.length) > 0 ? Math.max(0, (1 - total) / (3 - known.length)) : 0;
    const arr = [pHome ?? fill, tie ?? fill, pAway ?? fill];
    const sum = arr.reduce((s, p) => s + p, 0);
    if (sum <= 0) return null;
    const norm = arr.map(p => p / sum);

    const margin = 1.06;
    const toOdds = (p: number) => Math.max(1.01, Math.min(50, Math.round(100 / (p * margin)) / 100));
    return { odds_home: toOdds(norm[0]), odds_draw: toOdds(norm[1]), odds_away: toOdds(norm[2]) };
  } catch (e) {
    console.error(`SX Bet error for ${home} vs ${away}:`, e);
    return null;
  }
}
