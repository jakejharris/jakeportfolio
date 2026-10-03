import React from 'react';

/*
 * Three DGX Sparks wired as a switchless ring, drawn from photographs of the
 * machine. Every part is placed in millimetres and projected once: x runs
 * across a Spark's face, d runs back into the picture and z runs up from the
 * bottom of its body. A Spark is 150 × 150 mm with a 45.5 mm body that stands
 * clear of the desk on an inset foot, so each face is drawn 208 × 64. The
 * origin is Rank 1's front-left corner at the foot of its body.
 */
type Place = readonly [x: number, d: number, z: number];
const project = ([x, d, z]: Place) => [45 + x * 208 / 150 + d * 82 / 150, 515 + x * 32 / 150 - d * 72 / 150 - z * 64 / 45.5];
const pt = (p: Place) => project(p).map(n => n.toFixed(1)).join(' ');
/** Millimetres across a face, and down from its top edge, in drawing units. */
const fx = (mm: number) => +(mm * 208 / 150).toFixed(2);
const fy = (mm: number) => +(mm * 64 / 45.5).toFixed(2);

/**
 * Rank 0 is turned round so that its rear panel faces the other two. In a
 * switchless ring each Spark cables both of its QSFP ports, one to each
 * neighbour, so every cable runs from rear panel to rear panel. The pairing
 * follows the vendor's three-Spark playbook: each Spark's Port 0, the cage
 * next to Ethernet, runs to the next Spark's Port 1.
 */
const SPARKS = [
  { x: -120, d: 600, rear: true, rank: '00 / API HEAD' },
  { x: 0, d: 0, rear: false, rank: '01 / WORKER' },
  { x: 215, d: 70, rear: false, rank: '02 / WORKER' },
] as const;

/** The two QSFP cages, Port 0 then Port 1, sit side by side at the right-hand end of the rear panel seen from behind. */
const QSFP = [106.7, 125.8];
const PORT_Z = 12.3;
/** A DAC plug stands 36 mm proud of the panel: a 25 mm metal shell, then its boot. */
const PLUG = 36;

/** Where a cable leaves its plug, and the way the plug points: towards the viewer on Rank 0, away from it on the others. */
function plugEnd(rank: number, port: number) {
  const s = SPARKS[rank];
  return s.rear
    ? { at: [s.x + QSFP[port], s.d - PLUG, PORT_Z] as Place, out: -1 }
    : { at: [s.x + 150 - QSFP[port], s.d + 150 + PLUG, PORT_Z] as Place, out: 1 };
}

/** A cable leaves each plug along the port's axis and sags onto the desk in between. Each end is [rank, port, straight run out of the plug in mm]. */
function cable([ra, pa, reachA]: number[], [rb, pb, reachB]: number[]) {
  const a = plugEnd(ra, pa), b = plugEnd(rb, pb);
  const pull = (end: typeof a, reach: number): Place => [end.at[0], end.at[1] + end.out * reach, -1.5];
  return `M${pt(a.at)}C${pt(pull(a, reachA))} ${pt(pull(b, reachB))} ${pt(b.at)}`;
}

const fabricLinks = [
  { id: '01', d: cable([0, 0, 90], [1, 1, 110]), rest: -16 },
  { id: '02', d: cable([0, 1, 80], [2, 0, 130]), rest: -28 },
  { id: '12', d: cable([1, 0, 150], [2, 1, 120]), rest: -9 },
];

/** The faces of a box that the viewer sees: its near end, its top and its right side. */
function box([x0, x1]: number[], [d0, d1]: number[], [z0, z1]: number[]) {
  const face = (...corners: Place[]) => `M${corners.map(pt).join(' ')}Z`;
  return {
    end: face([x0, d0, z0], [x1, d0, z0], [x1, d0, z1], [x0, d0, z1]),
    top: face([x0, d0, z1], [x1, d0, z1], [x1, d1, z1], [x0, d1, z1]),
    side: face([x1, d0, z0], [x1, d1, z0], [x1, d1, z1], [x1, d0, z1]),
  };
}

/** A QSFP DAC plug in one of Rank 0's cages: a bright metal shell, then a black boot. */
function Plug({ port }: { port: number }) {
  const { x, d } = SPARKS[0], c = x + QSFP[port];
  const shell = box([c - 9.2, c + 9.2], [d - 25, d], [PORT_Z - 4.1, PORT_Z + 4.1]);
  const boot = box([c - 4.6, c + 4.6], [d - PLUG, d - 25], [PORT_Z - 3.6, PORT_Z + 3.6]);
  return <g>
    <path d={shell.side} fill="#7b8186" /><path d={shell.top} fill="#c2c6c9" /><path d={shell.end} fill="#9da3a8" />
    <path d={`M${pt([c - 9.2, d - 25, PORT_Z + 4.1])} ${pt([c + 9.2, d - 25, PORT_Z + 4.1])}`} stroke="#eef0f1" strokeWidth=".6" />
    <path d={boot.side} fill="#141517" /><path d={boot.top} fill="#34363a" /><path d={boot.end} fill="#222427" />
  </g>;
}

/** A polished plate set flush in the foam, with an air-intake slot at its outer edge: a satin recess with a bright bevelled rim. */
function Plate({ x, slot }: { x: number; slot: number }) {
  return <>
    <rect x={fx(x)} y={fy(4.3)} width={fx(25.2)} height={fy(36.6)} rx={fx(3.2)} fill="url(#jsv-spark-plate)" stroke="#2c2519" strokeWidth=".8" />
    <rect x={fx(slot)} y={fy(5.8)} width={fx(9.5)} height={fy(34.1)} rx={fx(4.75)} fill="url(#jsv-spark-slot)" stroke="#f4ead2" strokeWidth=".5" />
  </>;
}

/** The front, measured from front-on photographs: a slotted plate at each end. No maker's badge or name is drawn. */
function FrontPanel() {
  return <>
    <Plate x={6.8} slot={8.3} />
    <Plate x={118} slot={132.2} />
  </>;
}

/** The rear, measured from rear-on photographs, in the order the quick start guide labels it: on/off, USB-C power, three USB-C, HDMI, Ethernet and the QSFP pair, on one plate low in the foam. */
function RearPanel() {
  const hole = '#0d0c0a';
  return <>
    <rect x={fx(10.5)} y={fy(26)} width={fx(129)} height={fy(15.3)} rx="5.5" fill="url(#jsv-spark-io)" stroke="#2c2519" strokeWidth=".8" />
    <rect x={fx(14.8)} y={fy(29.4)} width={fx(3.2)} height={fy(8.7)} rx={fx(1.6)} fill="none" stroke="#6f5f43" strokeWidth=".6" />
    {[24.1, 31.6, 39.2, 46.5].map(c => <rect key={c} x={fx(c - 1.45)} y={fy(29.2)} width={fx(2.9)} height={fy(8.9)} rx={fx(1.45)} fill={hole} />)}
    <path d={`M${fx(55.4)} ${fy(32.5)}H${fx(70)}V${fy(36.3)}L${fx(68.6)} ${fy(37.7)}H${fx(56.8)}L${fx(55.4)} ${fy(36.3)}Z`} fill={hole} />
    <path d={`M${fx(76.4)} ${fy(29.9)}H${fx(79.7)}V${fy(28.2)}H${fx(85.6)}V${fy(29.9)}H${fx(88.9)}V${fy(37.7)}H${fx(76.4)}Z`} fill={hole} />
    <rect x={fx(97.2)} y={fy(28.4)} width={fx(38.3)} height={fy(9.5)} rx=".6" fill={hole} />
  </>;
}

function Spark({ rank }: { rank: number }) {
  const s = SPARKS[rank];
  const [x, y] = project([s.x, s.d, 0]);
  return (
    <g transform={`translate(${x.toFixed(1)} ${(y - 126).toFixed(1)})`}>
      <ellipse cx="150" cy="154" rx="157" ry="37" fill="url(#jsv-spark-shadow)" />
      {/* The body stands clear of the desk on an inset foot, so a dark gap runs under it. */}
      <path d="M0 126 208 158 290 86V93L208 165 0 133Z" fill="#0b0d0b" />
      {/* The shell is plain: no seams, vents or logo on the top or sides. */}
      <path d="M208 94 290 22V86L208 158Z" fill="url(#jsv-spark-side)" />
      <path d="M0 62 82-10 290 22 208 94Z" fill="url(#jsv-spark-top)" />
      {/* The foam panels run the full height, so their top edges show along the front and back of the lid. */}
      <path d="M0 62 208 94 210.2 92.1 2.2 60.1ZM79.8-8.1 82-10 290 22 287.8 23.9Z" fill="#a8946f" />
      <path d="M0 62 208 94 210.2 92.1 2.2 60.1ZM79.8-8.1 82-10 290 22 287.8 23.9Z" fill="url(#jsv-spark-mesh)" />
      <path d="M0 62 208 94 290 22" fill="none" stroke="#f3e5c3" strokeWidth=".7" opacity=".5" />
      <g transform="matrix(1 .153846 0 1 0 62)">
        <rect width="208" height="64" fill="url(#jsv-spark-foam)" />
        <rect width="208" height="64" fill="url(#jsv-spark-mesh)" />
        {/* The side walls' edges frame the foam. */}
        <path d="M0 0H4.2V64H0ZM203.8 0H208V64H203.8Z" fill="url(#jsv-spark-wall)" />
        {s.rear ? <RearPanel /> : <FrontPanel />}
      </g>
      <text className="jsv-svg-rank" x="145" y="193" textAnchor="middle" fontSize="14" fill="#b4bcaa" letterSpacing="2">{s.rank}</text>
    </g>
  );
}

/** note: what the caption says the three do; each page says it in its release's words. */
export default function ClusterIllustration({ note = 'Rank 0 serves the API; all three run inference.' }: { note?: string }) {
  return (
    <figure className="jsv-cluster">
      <svg viewBox="0 0 720 660" role="img" aria-labelledby="jsv-cluster-title jsv-cluster-desc">
        <title id="jsv-cluster-title">Three Sparks. One model.</title>
        <desc id="jsv-cluster-desc">Three champagne-gold DGX Sparks with metal-foam faces, wired as a switchless ring: each Spark cables both of its rear QSFP ports, one to each of the other two. The two workers face forward; Rank 0 is turned round to show its rear panel and the two cables in it. Token pulses illustrate shared fabric activity, not live telemetry or sequential model execution. Rank zero exposes the API; all three machines participate in tensor-parallel execution.</desc>
        <defs>
          <linearGradient id="jsv-spark-top" x1=".1" y1="0" x2=".65" y2="1">
            <stop stopColor="#dccaa5" /><stop offset=".55" stopColor="#c6b18b" /><stop offset="1" stopColor="#a99470" />
          </linearGradient>
          <linearGradient id="jsv-spark-side" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#8b7858" /><stop offset=".55" stopColor="#ae9a76" /><stop offset="1" stopColor="#c9b590" />
          </linearGradient>
          <linearGradient id="jsv-spark-foam" x1="0" y1="0" x2=".7" y2="1">
            <stop stopColor="#c0ac86" /><stop offset=".5" stopColor="#a38e68" /><stop offset="1" stopColor="#b39d76" />
          </linearGradient>
          <linearGradient id="jsv-spark-wall" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#e8d7b2" /><stop offset="1" stopColor="#b9a47e" />
          </linearGradient>
          <linearGradient id="jsv-spark-plate" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f1e3c3" /><stop offset=".5" stopColor="#d9c49b" /><stop offset="1" stopColor="#ae976d" />
          </linearGradient>
          <linearGradient id="jsv-spark-slot" x1="0" y1="0" x2=".35" y2="1">
            <stop stopColor="#5f5445" /><stop offset=".6" stopColor="#968870" /><stop offset="1" stopColor="#cfc0a0" />
          </linearGradient>
          <linearGradient id="jsv-spark-io" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#d4c29c" /><stop offset="1" stopColor="#b09c77" />
          </linearGradient>
          <radialGradient id="jsv-spark-shadow">
            <stop stopColor="#080d09" stopOpacity=".65" /><stop offset="1" stopColor="#080d09" stopOpacity="0" />
          </radialGradient>
          {/* One small, irregular tile gives every foam panel its porous metal texture. */}
          <pattern id="jsv-spark-mesh" width="20" height="16" patternUnits="userSpaceOnUse">
            <path d="M14.74 0.58 14.74 2.60 14.00 2.83 12.62 2.31 12.57 1.74 13.15 0.66ZM13.57 6.10 12.92 7.24 12.21 6.97 11.20 5.75 11.41 5.49 13.35 5.32ZM5.39 6.82 4.72 5.32 5.00 5.04 6.66 5.19 6.98 6.62 6.30 6.94ZM15.63 2.64 15.63 0.55 15.78 0.34 17.10 0.57 17.47 2.04 16.05 2.85ZM-0.67 7.59 -0.65 7.19 -0.57 7.18 1.51 8.31 1.62 8.81 0.83 9.22 0.19 9.07ZM19.33 7.59 19.35 7.19 19.43 7.18 21.51 8.31 21.62 8.81 20.83 9.22 20.19 9.07ZM18.04 0.13 19.27 0.90 19.52 1.45 19.19 2.17 17.83 2.02 17.43 0.41ZM16.09 11.93 16.20 11.29 16.94 10.40 17.16 10.37 17.62 10.71 17.85 11.57 17.02 12.86 16.58 12.86ZM10.92 -2.28 11.53 -1.17 10.05 0.04 9.14 0.14 9.54 -2.11ZM10.92 13.72 11.53 14.83 10.05 16.04 9.14 16.14 9.54 13.89ZM1.57 0.79 0.01 1.22 -0.24 0.68 0.28 -0.96 0.65 -1.19 0.76 -1.16ZM1.57 16.79 0.01 17.22 -0.24 16.68 0.28 15.04 0.65 14.81 0.76 14.84ZM21.57 0.79 20.01 1.22 19.76 0.68 20.28 -0.96 20.65 -1.19 20.76 -1.16ZM21.57 16.79 20.01 17.22 19.76 16.68 20.28 15.04 20.65 14.81 20.76 14.84ZM10.72 6.04 11.82 7.35 10.41 8.52 9.37 7.06 10.72 6.04ZM0.75 3.83 0.53 5.47 -0.78 6.05 -0.86 6.06 -1.07 5.86 -1.24 5.48 -0.29 3.23ZM20.75 3.83 20.53 5.47 19.22 6.05 19.14 6.06 18.93 5.86 18.76 5.48 19.71 3.23ZM7.49 0.54 5.99 1.18 5.05 0.40 5.22 -0.16 6.57 -1.06 7.61 0.40ZM7.49 16.54 5.99 17.18 5.05 16.40 5.22 15.84 6.57 14.94 7.61 16.40ZM14.47 10.19 14.73 8.85 15.22 8.78 16.45 9.95 15.67 10.87ZM0.84 6.17 2.33 6.25 2.39 6.58 1.75 7.98 -0.50 6.76ZM20.84 6.17 22.33 6.25 22.39 6.58 21.75 7.98 19.50 6.76ZM17.53 9.82 18.76 7.75 19.71 9.39 19.16 10.15 18.01 10.18ZM4.32 4.36 4.04 4.64 3.11 4.94 2.44 3.56 2.57 3.34 3.97 3.20 4.18 3.34ZM0.88 14.22 0.77 14.20 0.16 12.76 1.77 12.43 2.10 13.78ZM12.62 11.72 11.46 12.03 10.53 11.09 10.73 10.26 12.14 10.16 12.67 10.89ZM16.39 4.99 17.77 5.96 17.96 6.38 15.82 7.28 15.16 6.24ZM3.62 1.12 4.70 0.84 5.62 1.61 5.50 2.01 4.55 2.82 4.33 2.68ZM13.79 13.67 13.56 12.43 15.41 12.29 15.90 13.23 15.15 14.32ZM8.92 0.82 9.88 2.72 8.75 3.63 8.23 3.61 8.19 1.06 8.31 0.91Z" fill="#17120c" stroke="#d2be98" strokeWidth=".5" strokeLinejoin="round" />
            <path d="M12.86 12.29 13.07 12.47 13.31 13.78 12.10 14.65 11.85 14.58 11.28 13.56 11.57 12.64ZM11.80 1.83 11.85 2.47 11.38 2.80 10.20 2.56 9.25 0.67 9.31 0.64 10.13 0.54ZM13.43 7.53 14.08 6.39 14.92 6.42 15.54 7.41 15.13 8.12 14.65 8.19 13.52 7.71ZM2.84 5.34 2.51 5.78 0.77 5.69 1.03 3.73 2.00 3.63ZM2.86 6.04 3.18 5.60 4.34 5.22 5.16 7.07 4.23 7.71 2.92 6.42ZM11.70 -0.90 11.97 -0.83 12.72 0.33 12.04 1.61 10.28 0.26ZM11.70 15.10 11.97 15.17 12.72 16.33 12.04 17.61 10.28 16.26ZM16.33 3.40 17.78 2.57 19.06 2.72 19.13 2.97 18.16 5.25 16.88 4.34ZM12.28 3.20 13.67 3.72 13.27 4.95 11.45 5.11 11.86 3.50ZM1.89 3.27 1.03 3.35 -0.06 2.73 -0.14 2.46 0.18 1.76 1.70 1.34 1.98 1.40 2.04 3.02ZM21.89 3.27 21.03 3.35 19.94 2.73 19.86 2.46 20.18 1.76 21.70 1.34 21.98 1.40 22.04 3.02ZM10.68 9.51 10.72 8.72 11.91 7.73 12.56 7.98 12.64 8.15 12.07 9.47 10.71 9.57ZM6.63 7.53 7.43 7.15 7.76 7.33 7.93 9.11 7.33 9.81 6.09 9.96 5.93 9.54ZM5.31 7.42 6.25 7.54 5.64 9.30 4.44 8.51 4.52 7.96ZM0.34 14.37 -0.01 14.59 -1.40 14.49 -1.75 13.76 -0.37 12.89 -0.27 12.96ZM20.34 14.37 19.99 14.59 18.60 14.49 18.25 13.76 19.63 12.89 19.73 12.96ZM1.11 9.78 1.96 9.33 2.56 9.65 2.68 10.22 2.08 11.33 2.07 11.34 1.16 10.74ZM4.86 11.39 4.87 12.20 4.71 12.27 2.54 11.56 3.13 10.48ZM2.12 0.61 1.86 0.55 1.14 -1.21 2.27 -1.61 2.70 -1.44 2.65 0.39ZM2.12 16.61 1.86 16.55 1.14 14.79 2.27 14.39 2.70 14.56 2.65 16.39ZM9.13 7.32 10.10 8.69 10.05 9.57 8.37 9.03 8.21 7.41ZM2.53 2.96 2.48 1.48 3.00 1.27 3.27 1.34 3.94 2.82ZM9.88 9.98 9.91 10.04 9.70 10.90 8.67 11.44 7.72 10.08 8.26 9.46ZM11.14 12.48 10.84 13.44 9.53 13.61 8.54 12.65 8.89 12.00 10.05 11.38ZM8.87 -0.04 8.81 -0.00 8.19 0.08 7.08 -1.47 6.97 -2.51 8.29 -3.03 9.24 -2.11ZM8.87 15.96 8.81 16.00 8.19 16.08 7.08 14.53 6.97 13.49 8.29 12.97 9.24 13.89Z" fill="#211a12" stroke="#d2be98" strokeWidth=".5" strokeLinejoin="round" />
            <path d="M15.68 8.39 16.06 7.72 17.95 6.93 18.15 7.11 18.14 7.52 17.01 9.42 16.80 9.46ZM12.53 9.78 13.22 8.18 14.47 8.71 14.18 10.17 13.15 10.64ZM19.90 -0.98 19.44 0.46 18.35 -0.22 18.62 -1.07ZM19.90 15.02 19.44 16.46 18.35 15.78 18.62 14.93ZM6.72 12.93 5.70 12.29 5.68 11.38 6.16 10.36 7.37 10.22 8.43 11.75 8.08 12.40ZM0.03 9.64 0.72 9.81 0.77 10.76 -0.06 11.23 -0.51 10.38ZM20.03 9.64 20.72 9.81 20.77 10.76 19.94 11.23 19.49 10.38ZM7.76 3.52 7.32 3.81 6.16 2.21 6.27 1.81 7.72 1.20ZM13.47 12.01 13.26 11.83 13.32 10.91 14.30 10.46 15.54 11.17 15.43 11.86ZM5.72 10.13 5.22 11.21 3.15 10.12 3.02 9.46 4.14 8.77 5.55 9.71ZM10.11 3.13 11.14 3.34 10.74 4.92 10.55 5.16 10.55 5.16 9.12 3.91ZM6.89 4.62 4.91 4.44 4.75 3.20 5.83 2.28 7.19 4.16ZM4.79 -0.29 4.61 0.33 3.41 0.64 3.09 0.56 3.15 -1.57 3.79 -1.77ZM4.79 15.71 4.61 16.33 3.41 16.64 3.09 16.56 3.15 14.43 3.79 14.23ZM7.81 6.53 7.45 4.94 7.73 4.51 8.21 4.18 8.73 4.20 10.36 5.62 9.06 6.61 8.11 6.70ZM16.46 -2.51 16.98 -2.51 17.83 -2.14 18.23 -1.30 17.90 -0.24 17.22 0.08 15.63 -0.20 15.58 -1.24ZM16.46 13.49 16.98 13.49 17.83 13.86 18.23 14.70 17.90 15.76 17.22 16.08 15.63 15.80 15.58 14.76ZM0.03 12.50 -0.07 12.43 -0.14 12.17 0.04 11.52 0.95 11.00 1.96 11.66 1.76 12.14ZM20.03 12.50 19.93 12.43 19.86 12.17 20.04 11.52 20.95 11.00 21.96 11.66 21.76 12.14ZM14.80 -0.05 13.08 0.04 12.39 -1.02 13.54 -1.84 14.92 -1.18 14.97 -0.27ZM14.80 15.95 13.08 16.04 12.39 14.98 13.54 14.16 14.92 14.82 14.97 15.73ZM14.25 3.70 15.15 3.42 15.63 3.67 16.25 4.74 14.95 6.06 14.02 6.02 13.77 5.15ZM2.80 6.73 3.96 7.87 3.88 8.45 2.89 9.06 2.27 8.73 2.15 8.18ZM5.28 13.20 6.13 13.73 6.22 14.61 5.00 15.43 4.18 14.21 5.13 13.28ZM19.19 10.50 19.68 11.42 19.51 12.06 18.23 11.48 17.97 10.53ZM3.67 13.80 3.00 14.00 2.47 13.80 2.10 12.28 2.30 11.78 2.31 11.78 4.87 12.62ZM19.28 12.29 19.33 12.51 18.04 13.33 17.35 13.03 18.15 11.78Z" fill="#2d251a" stroke="#d2be98" strokeWidth=".5" strokeLinejoin="round" />
            <path d="M12.57 1.74 13.15 0.66M11.28 13.56 11.57 12.64M15.68 8.39 16.06 7.72M11.20 5.75 11.41 5.49M9.25 0.67 9.31 0.64M12.53 9.78 13.22 8.18M4.72 5.32 5.00 5.04M13.43 7.53 14.08 6.39M18.35 -0.22 18.62 -1.07M18.35 15.78 18.62 14.93M15.63 0.55 15.78 0.34M1.03 3.73 2.00 3.63M5.68 11.38 6.16 10.36M-0.65 7.19 -0.57 7.18M19.35 7.19 19.43 7.18M2.86 6.04 3.18 5.60M-0.51 10.38 0.03 9.64M19.49 10.38 20.03 9.64M17.43 0.41 18.04 0.13M10.28 0.26 11.70 -0.90M10.28 16.26 11.70 15.10M6.16 2.21 6.27 1.81M16.20 11.29 16.94 10.40M16.33 3.40 17.78 2.57M13.32 10.91 14.30 10.46M9.54 -2.11 10.92 -2.28M9.54 13.89 10.92 13.72M11.86 3.50 12.28 3.20M3.02 9.46 4.14 8.77M0.28 -0.96 0.65 -1.19M0.28 15.04 0.65 14.81M20.28 -0.96 20.65 -1.19M20.28 15.04 20.65 14.81M-0.14 2.46 0.18 1.76M19.86 2.46 20.18 1.76M9.12 3.91 10.11 3.13M9.37 7.06 10.72 6.04M10.72 8.72 11.91 7.73M4.75 3.20 5.83 2.28M-1.24 5.48 -0.29 3.23M18.76 5.48 19.71 3.23M6.63 7.53 7.43 7.15M3.15 -1.57 3.79 -1.77M3.15 14.43 3.79 14.23M5.05 0.40 5.22 -0.16M5.05 16.40 5.22 15.84M4.52 7.96 5.31 7.42M7.45 4.94 7.73 4.51M14.73 8.85 15.22 8.78M-1.75 13.76 -0.37 12.89M18.25 13.76 19.63 12.89M15.58 -1.24 16.46 -2.51M15.58 14.76 16.46 13.49M-0.50 6.76 0.84 6.17M19.50 6.76 20.84 6.17M1.11 9.78 1.96 9.33M0.04 11.52 0.95 11.00M20.04 11.52 20.95 11.00M17.53 9.82 18.76 7.75M2.54 11.56 3.13 10.48M12.39 -1.02 13.54 -1.84M12.39 14.98 13.54 14.16M2.44 3.56 2.57 3.34M1.14 -1.21 2.27 -1.61M1.14 14.79 2.27 14.39M14.25 3.70 15.15 3.42M0.16 12.76 1.77 12.43M8.21 7.41 9.13 7.32M2.15 8.18 2.80 6.73M10.53 11.09 10.73 10.26M2.48 1.48 3.00 1.27M4.18 14.21 5.13 13.28M15.16 6.24 16.39 4.99M7.72 10.08 8.26 9.46M17.97 10.53 19.19 10.50M3.62 1.12 4.70 0.84M8.54 12.65 8.89 12.00M2.30 11.78 2.31 11.78M13.79 13.67 13.56 12.43M6.97 -2.51 8.29 -3.03M6.97 13.49 8.29 12.97M17.35 13.03 18.15 11.78M8.19 1.06 8.31 0.91" fill="none" stroke="#f5e8c9" strokeWidth=".24" opacity=".7" />
          </pattern>
          <pattern id="jsv-grid" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#647155" /></pattern>
          {fabricLinks.map(link => <path key={link.id} id={`jsv-fabric-${link.id}`} d={link.d} pathLength="100" />)}
        </defs>
        <rect x="40" y="60" width="640" height="540" fill="url(#jsv-grid)" opacity=".3" />
        {/* Drawn back to front: Rank 0, the cables leaving its plugs, then the two workers the cables run behind. */}
        <Spark rank={0} />
        {/* Each link has its own phase and direction: illustrative activity across the fabric. */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {fabricLinks.map(link => (
            <g key={link.id} className={`jsv-fabric-link jsv-fabric-link-${link.id}`}>
              <use href={`#jsv-fabric-${link.id}`} stroke="#090f0a" strokeWidth="8" />
              <use href={`#jsv-fabric-${link.id}`} stroke="#72865d" strokeWidth="3.2" />
              <use href={`#jsv-fabric-${link.id}`} stroke="#bfce9e" strokeWidth=".8" opacity=".4" />
              {/* The animated strokes use the exact geometry of their underlying cables. */}
              <path d={link.d} pathLength="100" className="jsv-token jsv-token-halo" stroke="#d6eea2" strokeWidth="9" strokeDasharray="3.5 46.5" strokeDashoffset={link.rest} opacity=".16" />
              <path d={link.d} pathLength="100" className="jsv-token" stroke="#e2f8b4" strokeWidth="4.2" strokeDasharray="3.5 46.5" strokeDashoffset={link.rest} />
            </g>
          ))}
        </g>
        <Plug port={0} />
        <Plug port={1} />
        <Spark rank={2} />
        <Spark rank={1} />
        <g className="jsv-svg-cap"><path d="M349 33v33" stroke="#929d83" strokeWidth="1" /><circle cx="349" cy="29" r="4" fill="#d8ef9d" />
          <text x="365" y="36" fontSize="10" fill="#b4bcaa" letterSpacing="1.5">ONE ENDPOINT</text></g>
        <text className="jsv-svg-cap" x="356" y="602" textAnchor="middle" fontSize="10" fill="#b4bcaa" letterSpacing="2">THREE-WAY EXECUTION / RoCE FABRIC</text>
      </svg>
      <figcaption>Three DGX Sparks · one endpoint<span>{note}</span></figcaption>
    </figure>
  );
}
