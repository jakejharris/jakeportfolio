export type Ym = string;

export type SeriesRow = {
  ym: Ym;
  nvidia: number | null;
  amd: number | null;
  intel: number | null;
  spark: number | null;
  fc: boolean;
};

export type ScenarioKey =
  | 'baseline'
  | 'race'
  | 'slowdown'
  | 'planA'
  | 'planS'
  | 'planC'
  | 'planD';

export const SPARK_START: Ym = '2025-10';
export const HIST_END: Ym = '2026-08';
export const FC_END: Ym = '2040-12';

type SeriesKey = 'nvidia' | 'amd' | 'intel' | 'spark';
type Anchor = readonly [ym: Ym, value: number | null];
type AnchorSeries = Record<SeriesKey, readonly Anchor[]>;

type ScenarioDefinition = AnchorSeries & {
  name: string;
  short: string;
  fam: 'base' | '27' | '40';
  desc: string;
  driver: string;
};

type ScenarioSummary = Pick<
  ScenarioDefinition,
  'name' | 'short' | 'fam' | 'desc' | 'driver'
> & { key: ScenarioKey };

const HISTORICAL_MONTHS = monthsBetween('2018-01', HIST_END);

const HISTORICAL_NVIDIA: readonly number[] = [
  1050, 1000, 950, 883, 817, 750, 725, 700, 1199, 1216, 1233, 1250,
  1233, 1217, 1200, 1183, 1167, 1150, 1142, 1133, 1125, 1117, 1108, 1100,
  1108, 1117, 1125, 1133, 1142, 1150, 1266, 1383, 1499, 1800, 2000, 2200,
  2400, 2707, 3014, 3321, 3628, 3264, 2900, 2867, 2833, 2800, 2900, 3000,
  2700, 2400, 2100, 2033, 1967, 1900, 1700, 1500, 1300, 1599, 2216, 2058,
  1900, 1833, 1767, 1700, 1701, 1701, 1702, 1703, 1703, 1704, 1753, 1801,
  1850, 1830, 1810, 1790, 1770, 1750, 1788, 1825, 1862, 1900, 2200, 2500,
  1999, 5000, 4000, 3767, 3533, 3300, 3067, 2833, 2600, 2700, 2800, 2900,
  3200, 3367, 3533, 3700, 3793, 3887, 3980, 4200,
];

const HISTORICAL_AMD: readonly number[] = [
  1000, 900, 800, 733, 667, 600, 562, 525, 488, 450, 512, 574,
  637, 699, 699, 699, 699, 699, 699, 699, 687, 674, 662, 650,
  645, 640, 635, 630, 625, 620, 628, 635, 642, 650, 824, 999,
  1500, 1618, 1736, 1854, 1972, 1881, 1791, 1700, 1725, 1750, 1775, 1800,
  1667, 1533, 1400, 1275, 1150, 1083, 1017, 950, 910, 870, 830, 1100,
  1067, 1033, 1000, 994, 989, 983, 977, 971, 966, 960, 954, 948,
  942, 936, 930, 925, 920, 915, 910, 905, 900, 917, 933, 950,
  925, 900, 750, 753, 757, 760, 720, 680, 640, 600, 625, 650,
  665, 680, 695, 710, 703, 697, 690, 700,
];

const HISTORICAL_INTEL: readonly (number | null)[] = [
  null, null, null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, 349, 437, 415,
  394, 372, 350, 338, 325, 312, 300, 304, 307, 311, 307, 303,
  298, 294, 290, 290, 290, 290, 290, 290, 290, 276, 263, 249,
  330, 320, 310, 300, 293, 286, 279, 272, 265, 263, 262, 260,
  268, 275, 282, 290, 297, 303, 310, 315,
];

const HISTORICAL_SPARK: Readonly<Record<Ym, number>> = {
  '2025-10': 3999,
  '2025-11': 3999,
  '2025-12': 3949.99,
  '2026-01': 3999,
  '2026-02': 3999,
  '2026-03': 4699,
  '2026-04': 4699,
  '2026-05': 4699,
  '2026-06': 4699,
  '2026-07': 4699,
  '2026-08': 4699,
};

const HIST: SeriesRow[] = HISTORICAL_MONTHS.map((ym, index) => ({
  ym,
  nvidia: HISTORICAL_NVIDIA[index],
  amd: HISTORICAL_AMD[index],
  intel: HISTORICAL_INTEL[index],
  spark: HISTORICAL_SPARK[ym] ?? null,
  fc: false,
}));

const AI40_SHARED: AnchorSeries = {
  nvidia: [
    ['2026-08', 4200],
    ['2026-12', 4500],
    ['2027-06', 4800],
    ['2027-12', 5200],
    ['2028-06', 5800],
    ['2028-12', 6000],
  ],
  amd: [
    ['2026-08', 700],
    ['2026-12', 760],
    ['2027-06', 1100],
    ['2027-12', 1250],
    ['2028-06', 1400],
    ['2028-12', 1500],
  ],
  intel: [
    ['2026-08', 315],
    ['2026-12', 330],
    ['2027-09', 480],
    ['2028-06', 560],
    ['2028-12', 600],
  ],
  spark: [
    ['2026-08', 4699],
    ['2026-12', 4999],
    ['2027-06', 5499],
    ['2027-12', 5999],
    ['2028-06', 6500],
    ['2028-12', 7000],
  ],
};

function append(
  shared: readonly Anchor[],
  scenario: readonly Anchor[]
): readonly Anchor[] {
  return [...shared, ...scenario];
}

const SCEN: Record<ScenarioKey, ScenarioDefinition> = {
  baseline: {
    name: 'Baseline (no takeoff)',
    short: 'Baseline',
    fam: 'base',
    desc: 'Neither scenario happens. The memory crunch eases through 2027, the two-year GPU cadence resumes with flagship MSRPs creeping up ~$500 a generation, and the Spark line gets a successor every other year at a modest premium.',
    driver: 'Normal cadence; MSRP creep of ~$500 per generation; no structural shock.',
    nvidia: [
      ['2026-08', 4200], ['2026-12', 4300], ['2027-03', 3500],
      ['2027-12', 2900], ['2028-12', 2400], ['2029-03', 3800],
      ['2029-12', 3100], ['2030-12', 2800], ['2031-03', 4000],
      ['2031-12', 3400], ['2032-12', 3000], ['2033-03', 4200],
      ['2033-12', 3600], ['2034-12', 3200], ['2035-03', 4400],
      ['2035-12', 3800], ['2036-12', 3400], ['2037-03', 4600],
      ['2037-12', 4000], ['2038-12', 3600], ['2039-03', 4800],
      ['2039-12', 4200], ['2040-12', 3800],
    ],
    amd: [
      ['2026-08', 700], ['2026-12', 720], ['2027-06', 1100],
      ['2027-12', 980], ['2028-12', 900], ['2029-06', 1150],
      ['2030-12', 1000], ['2031-06', 1250], ['2032-12', 1050],
      ['2033-06', 1300], ['2034-12', 1100], ['2035-06', 1400],
      ['2036-12', 1200], ['2037-06', 1500], ['2038-12', 1300],
      ['2039-06', 1600], ['2040-12', 1500],
    ],
    intel: [
      ['2026-08', 315], ['2026-12', 330], ['2027-09', 480],
      ['2028-12', 420], ['2029-12', 460], ['2031-09', 520],
      ['2033-09', 560], ['2035-09', 600], ['2037-09', 640],
      ['2039-09', 680], ['2040-12', 650],
    ],
    spark: [
      ['2026-08', 4699], ['2026-12', 4699], ['2027-03', 4999],
      ['2027-12', 4699], ['2028-12', 4499], ['2029-03', 4999],
      ['2030-12', 4699], ['2031-03', 5499], ['2032-12', 4999],
      ['2033-03', 5999], ['2034-12', 5499], ['2035-03', 6499],
      ['2036-12', 5999], ['2037-03', 6999], ['2038-12', 6499],
      ['2039-03', 7499], ['2040-12', 6999],
    ],
  },
  race: {
    name: 'AI 2027 · Race ending',
    short: 'AI 2027 Race',
    fam: '27',
    desc: 'AI 2027 followed exactly: $1T AI capex and 2.25×/yr compute growth pull wafers, HBM and GDDR away from consumer cards; Agent-3-mini (Jul 2027) sets off a local-inference rush; ASI by Dec 2027. Robot SEZs (1M robots/month by end-2028) collapse hardware prices through 2029; in mid-2030 the market ends with the takeover.',
    driver: 'Compute-bound intelligence explosion in 2027 starves consumer silicon; robot SEZs then deflate everything; market ends Jul 2030.',
    nvidia: [
      ['2026-08', 4200], ['2026-12', 4600], ['2027-03', 5500],
      ['2027-07', 6500], ['2027-12', 7500], ['2028-06', 6000],
      ['2028-12', 3000], ['2029-06', 1200], ['2029-12', 600],
      ['2030-06', 300], ['2030-07', null],
    ],
    amd: [
      ['2026-08', 700], ['2026-12', 850], ['2027-07', 1600],
      ['2027-12', 2000], ['2028-06', 1600], ['2028-12', 900],
      ['2029-12', 250], ['2030-06', 120], ['2030-07', null],
    ],
    intel: [
      ['2026-08', 315], ['2026-12', 380], ['2027-07', 700],
      ['2027-12', 900], ['2028-12', 450], ['2029-12', 120],
      ['2030-06', 60], ['2030-07', null],
    ],
    spark: [
      ['2026-08', 4699], ['2026-12', 4999], ['2027-03', 5499],
      ['2027-07', 7000], ['2027-12', 8500], ['2028-06', 6000],
      ['2028-12', 2500], ['2029-12', 500], ['2030-06', 200],
      ['2030-07', null],
    ],
  },
  slowdown: {
    name: 'AI 2027 · Slowdown ending',
    short: 'AI 2027 Slowdown',
    fam: '27',
    desc: 'Same path through Oct 2027, then the Defense Production Act consolidates US compute into OpenBrain (20% → 50% of world compute) and export controls tighten — consumer supply is squeezed hardest in early 2028. SEZ robot manufacturing and fusion then drive prices toward material cost, with UBI-era abundance through the 2030s.',
    driver: 'DPA consolidation prolongs the squeeze into 2028; SEZ manufacturing and fusion then deflate hardware toward material cost.',
    nvidia: [
      ['2026-08', 4200], ['2026-12', 4600], ['2027-03', 5500],
      ['2027-07', 6500], ['2027-12', 8000], ['2028-06', 7000],
      ['2028-12', 4000], ['2029-06', 2000], ['2029-12', 1000],
      ['2030-12', 400], ['2033-12', 150], ['2040-12', 50],
    ],
    amd: [
      ['2026-08', 700], ['2026-12', 850], ['2027-07', 1600],
      ['2027-12', 2200], ['2028-06', 1900], ['2028-12', 1200],
      ['2029-12', 350], ['2030-12', 150], ['2033-12', 60],
      ['2040-12', 20],
    ],
    intel: [
      ['2026-08', 315], ['2026-12', 380], ['2027-07', 700],
      ['2027-12', 1000], ['2028-06', 900], ['2028-12', 600],
      ['2029-12', 180], ['2030-12', 80], ['2033-12', 30],
      ['2040-12', 10],
    ],
    spark: [
      ['2026-08', 4699], ['2026-12', 4999], ['2027-03', 5499],
      ['2027-07', 7000], ['2027-12', 9000], ['2028-06', 7500],
      ['2028-12', 3500], ['2029-12', 700], ['2030-12', 300],
      ['2033-12', 120], ['2040-12', 40],
    ],
  },
  planA: {
    name: 'AI 2040 · Plan A (The Deal)',
    short: 'AI 2040 Plan A',
    fam: '40',
    desc: 'Capex of $1.4T (2027) and $2.4T (2028) with AI taking 65% of EUV capacity squeeze consumers through 2028. In 2029 the US–China deal brings a compute declaration, a training pause with inference-only verification (small clusters powered off), then a 30M-H100e cap on unverified edge compute with only 5M credits for new production. Consumer AI workstations average ~3.7 H100e in the scenario’s census (an actual Spark is nearer 0.1–0.3 H100e), so the class becomes the most permit-hungry consumer hardware on Earth: prices spike to permit-driven highs in 2030–2032. Verified edge hardware and post-deal fabs (60B H100e by 2034, chips 37× as efficient by 2040) then drive prices toward material cost while the citizen’s dividend reaches $1M (2035) and $10M (2040).',
    driver: 'Edge-compute cap (5M new credits) makes Spark-class boxes permit-priced in 2030–32; verified hardware and 1000× compute then deflate everything.',
    nvidia: append(AI40_SHARED.nvidia, [
      ['2029-06', 7500], ['2029-12', 8500], ['2030-12', 11000],
      ['2031-06', 12500], ['2032-06', 13000], ['2033-06', 6000],
      ['2033-12', 3500], ['2034-12', 1500], ['2035-12', 700],
      ['2037-12', 300], ['2040-12', 150],
    ]),
    amd: append(AI40_SHARED.amd, [
      ['2029-12', 2200], ['2031-06', 3500], ['2032-06', 3800],
      ['2033-06', 1800], ['2033-12', 1000], ['2034-12', 450],
      ['2035-12', 220], ['2037-12', 100], ['2040-12', 50],
    ]),
    intel: append(AI40_SHARED.intel, [
      ['2029-12', 900], ['2031-06', 1500], ['2032-06', 1700],
      ['2033-06', 800], ['2033-12', 450], ['2034-12', 200],
      ['2035-12', 100], ['2037-12', 50], ['2040-12', 25],
    ]),
    spark: append(AI40_SHARED.spark, [
      ['2029-03', 8000], ['2029-12', 12000], ['2030-12', 25000],
      ['2031-12', 38000], ['2032-06', 42000], ['2033-06', 15000],
      ['2033-12', 6000], ['2034-12', 2500], ['2035-12', 1200],
      ['2037-12', 600], ['2040-12', 300],
    ]),
  },
  planS: {
    name: 'AI 2040 · Plan S (Indefinite halt)',
    short: 'AI 2040 Plan S',
    fam: '40',
    desc: 'Same squeeze through 2028, then the deal machinery is used for an indefinite halt on frontier capabilities from 2029: training stops, datacenter GPUs are powered down or mine crypto, and AI capex collapses. Freed wafer capacity pushes gaming flagships back toward MSRP, then prices drift with a slowed, human-speed Moore’s law. AI-capable edge hardware stays reported and capped, so Spark-class boxes (running frozen pre-halt models) plateau instead of collapsing. The authors expect a halt to break down eventually; that is not modeled.',
    driver: 'Halt frees wafers (gaming cards cheaper) but freezes models and caps AI-capable edge compute, so Spark-class boxes plateau.',
    nvidia: append(AI40_SHARED.nvidia, [
      ['2029-06', 5500], ['2029-12', 5000], ['2030-06', 3500],
      ['2030-12', 2800], ['2031-12', 2400], ['2033-12', 2000],
      ['2035-12', 1700], ['2038-12', 1400], ['2040-12', 1200],
    ]),
    amd: append(AI40_SHARED.amd, [
      ['2029-12', 1200], ['2030-12', 800], ['2033-12', 650],
      ['2040-12', 450],
    ]),
    intel: append(AI40_SHARED.intel, [
      ['2029-12', 500], ['2030-12', 380], ['2040-12', 250],
    ]),
    spark: append(AI40_SHARED.spark, [
      ['2029-03', 8000], ['2029-12', 9000], ['2030-12', 7000],
      ['2032-12', 4500], ['2035-12', 3500], ['2040-12', 2500],
    ]),
  },
  planC: {
    name: 'AI 2040 · Plan C+ (Regulate, no deal)',
    short: 'AI 2040 Plan C+',
    fam: '40',
    desc: 'No international deal. The US buys time with domestic regulation and slows China with export controls; the buildout keeps squeezing consumers. An automated coder arrives in Jan 2030 and a 1.5-year takeoff reaches superintelligence in mid-2031, so the spike peaks later and higher than under Plan A’s pause. Robot-economy manufacturing then deflates hardware through the mid-2030s under a concentrated-power outcome; the market persists.',
    driver: 'Regulated race: squeeze lasts until ASI in mid-2031, then robot-economy deflation under concentrated power.',
    nvidia: append(AI40_SHARED.nvidia, [
      ['2029-06', 6500], ['2029-12', 7000], ['2030-06', 8000],
      ['2030-12', 9000], ['2031-06', 9500], ['2031-12', 8000],
      ['2032-12', 4000], ['2033-12', 1500], ['2034-12', 600],
      ['2035-12', 300], ['2037-12', 120], ['2040-12', 60],
    ]),
    amd: append(AI40_SHARED.amd, [
      ['2029-12', 2000], ['2031-06', 2800], ['2032-12', 1200],
      ['2034-12', 200], ['2040-12', 20],
    ]),
    intel: append(AI40_SHARED.intel, [
      ['2029-12', 800], ['2031-06', 1200], ['2032-12', 500],
      ['2034-12', 90], ['2040-12', 10],
    ]),
    spark: append(AI40_SHARED.spark, [
      ['2029-12', 9000], ['2030-12', 13000], ['2031-06', 14000],
      ['2031-12', 10000], ['2032-12', 4500], ['2033-12', 1500],
      ['2034-12', 600], ['2035-12', 300], ['2040-12', 80],
    ]),
  },
  planD: {
    name: 'AI 2040 · Plan D (Race)',
    short: 'AI 2040 Plan D',
    fam: '40',
    desc: 'Frontier projects race through the intelligence explosion at nearly max speed with a token safety budget. Automated coder Jan 2030, superintelligence by the end of 2030: the sharpest spike of any scenario as every wafer goes to the race. Robot-economy deflation follows through 2033, and the series ends in mid-2034 at the authors’ modal outcome for this plan, a misaligned takeover (most authors put it above 50%).',
    driver: 'Max-speed race: sharpest spike (ASI end-2030), fast deflation, market ends mid-2034 in the modal takeover.',
    nvidia: append(AI40_SHARED.nvidia, [
      ['2029-06', 7000], ['2029-12', 8500], ['2030-06', 10000],
      ['2030-12', 11000], ['2031-06', 9000], ['2031-12', 6000],
      ['2032-12', 2000], ['2033-12', 500], ['2034-06', 150],
      ['2034-07', null],
    ]),
    amd: append(AI40_SHARED.amd, [
      ['2029-12', 2300], ['2030-12', 3000], ['2031-12', 1600],
      ['2032-12', 600], ['2033-12', 120], ['2034-06', 40],
      ['2034-07', null],
    ]),
    intel: append(AI40_SHARED.intel, [
      ['2029-12', 900], ['2030-12', 1300], ['2031-12', 700],
      ['2032-12', 250], ['2033-12', 50], ['2034-06', 15],
      ['2034-07', null],
    ]),
    spark: append(AI40_SHARED.spark, [
      ['2029-12', 11000], ['2030-12', 16000], ['2031-12', 8000],
      ['2032-12', 2500], ['2033-12', 500], ['2034-06', 150],
      ['2034-07', null],
    ]),
  },
};

const SCENARIO_KEYS: readonly ScenarioKey[] = [
  'baseline',
  'race',
  'slowdown',
  'planA',
  'planS',
  'planC',
  'planD',
];

export const SCENARIOS: ScenarioSummary[] = SCENARIO_KEYS.map((key) => ({
  key,
  name: SCEN[key].name,
  short: SCEN[key].short,
  fam: SCEN[key].fam,
  desc: SCEN[key].desc,
  driver: SCEN[key].driver,
}));

export type Checkpoint = { year: number; ym: Ym };

export const CHECKPOINTS: Checkpoint[] = [
  { year: 2027, ym: '2027-12' },
  { year: 2028, ym: '2028-12' },
  { year: 2030, ym: '2030-12' },
  { year: 2032, ym: '2032-12' },
  { year: 2035, ym: '2035-12' },
  { year: 2040, ym: '2040-12' },
];

function addMonths(ym: Ym, amount: number): Ym {
  const [year, month] = ym.split('-').map(Number);
  const zeroBasedMonth = month - 1 + amount;
  const nextYear = year + Math.floor(zeroBasedMonth / 12);
  const nextMonth = ((zeroBasedMonth % 12) + 12) % 12;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;
}

function monthsBetween(start: Ym, end: Ym): Ym[] {
  const months: Ym[] = [];
  for (let ym = start; ym <= end; ym = addMonths(ym, 1)) {
    months.push(ym);
  }
  return months;
}

function monthDifference(from: Ym, to: Ym): number {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

function interp(anchors: readonly Anchor[], ym: Ym): number | null {
  let previous: Anchor | null = null;

  for (const anchor of anchors) {
    if (anchor[0] === ym) return anchor[1];

    if (anchor[0] > ym) {
      if (!previous || previous[1] === null) return null;
      if (anchor[1] === null) return previous[1];

      const progress =
        monthDifference(previous[0], ym) /
        monthDifference(previous[0], anchor[0]);
      return previous[1] + (anchor[1] - previous[1]) * progress;
    }

    previous = anchor;
  }

  return previous?.[1] ?? null;
}

function forecastForScenario(scenario: ScenarioDefinition): SeriesRow[] {
  return monthsBetween(addMonths(HIST_END, 1), FC_END).map((ym) => ({
    ym,
    nvidia: interp(scenario.nvidia, ym),
    amd: interp(scenario.amd, ym),
    intel: interp(scenario.intel, ym),
    spark: interp(scenario.spark, ym),
    fc: true,
  }));
}

const SERIES_CACHE = Object.fromEntries(
  SCENARIO_KEYS.map((key) => [key, [...HIST, ...forecastForScenario(SCEN[key])]])
) as Record<ScenarioKey, SeriesRow[]>;

export function seriesForScenario(key: ScenarioKey): SeriesRow[] {
  return SERIES_CACHE[key].map((row) => ({ ...row }));
}

export function checkpointValue(
  key: ScenarioKey,
  series: SeriesKey,
  ym: Ym
): number | null {
  return SERIES_CACHE[key].find((row) => row.ym === ym)?.[series] ?? null;
}
