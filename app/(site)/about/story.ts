// The About story at three lengths. Every sentence belongs to the shortest
// version that keeps it: 1 (short), 2 (medium) or 3 (long). Each version is
// the next one with sentences taken out, so switching lengths edits the story
// in place instead of swapping in a different text.

export type Length = 1 | 2 | 3;

export type Piece = string | { text: string; href: string };

export interface Sentence {
  min: Length;
  pieces: Piece[];
}

export interface Paragraph {
  /** The shortest version in which this paragraph starts a new one. Below
   *  it, the paragraph runs on from the one before. */
  breaksAt: Length;
  sentences: Sentence[];
}

export const LENGTHS: { value: Length; label: string }[] = [
  { value: 1, label: 'Short' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Long' },
];

export const DEFAULT_LENGTH: Length = 2;

export const STORY: Paragraph[] = [
  {
    breaksAt: 1,
    sentences: [
      { min: 1, pieces: ["I’ve been building things on computers since before I knew it could be a career."] },
      { min: 3, pieces: ['Software, tooling, hardware, it never mattered what.'] },
      { min: 2, pieces: ["The act of creating something from nothing is the only work that’s ever made me feel like I’m not working."] },
    ],
  },
  {
    breaksAt: 3,
    sentences: [
      { min: 3, pieces: ['I grew up in Atlanta, where I co-founded Lions Heart, a youth volunteer organization that coordinated more than 10,000 hours of community service across the city.'] },
    ],
  },
  {
    breaksAt: 3,
    sentences: [
      { min: 2, pieces: ['I moved to Washington, DC to study computer science at George Washington University and row Division I.'] },
      { min: 3, pieces: ['Our crew finished seventh at the IRA National Championship, an experience that taught me consistency, trust, and teamwork.'] },
    ],
  },
  {
    breaksAt: 3,
    sentences: [
      {
        min: 2,
        pieces: [
          'After college I co-founded ',
          { text: 'AdventureGenie', href: '/posts/ai-driven-trip-planning-with-ag/' },
          ', an AI trip planner for RV travelers, and led its frontend and design as it grew past 50,000 monthly users.',
        ],
      },
      { min: 3, pieces: ['I helped raise $3 million along the way.'] },
      { min: 3, pieces: ['AdventureGenie taught me to work across the whole problem, from a customer’s first impression to the infrastructure behind it, and showed me that AI works best when it shapes the product from the beginning.'] },
    ],
  },
  {
    breaksAt: 3,
    sentences: [
      {
        min: 2,
        pieces: [
          'Then I started ',
          { text: 'JJH Digital', href: '/posts/jjh-digital/' },
          ', where I build and operate software for clients who need more than a template.',
        ],
      },
      { min: 3, pieces: ['I’ve delivered full-stack, e-commerce, membership, and AI systems, owning projects from the first conversation through launch and long-term operation.'] },
    ],
  },
  {
    breaksAt: 2,
    sentences: [
      { min: 1, pieces: ["Today I’m a software engineer on Docusign’s Workspaces team in Chicago."] },
      { min: 3, pieces: ['I ship customer-facing features and production systems, and I help engineers across the company work more effectively with AI.'] },
    ],
  },
  {
    breaksAt: 3,
    sentences: [
      {
        min: 1,
        pieces: [
          'Outside work, I run my own AI assistant on ',
          { text: 'three small computers', href: '/jspark3/' },
          ' and write here about what I learn.',
        ],
      },
      {
        min: 2,
        pieces: [
          'Most of it comes back to one idea: ',
          { text: 'context is the bottleneck, not intelligence', href: '/posts/compression-as-intelligence/' },
          '.',
        ],
      },
    ],
  },
  {
    breaksAt: 3,
    sentences: [
      { min: 3, pieces: ['I’m most at home working on hard problems with small teams, especially when I can stay close to both the people using the product and the systems behind it.'] },
    ],
  },
];

export function sentenceText(sentence: Sentence) {
  return sentence.pieces.map((piece) => (typeof piece === 'string' ? piece : piece.text)).join('');
}

export function paragraphMin(paragraph: Paragraph): Length {
  return Math.min(...paragraph.sentences.map((sentence) => sentence.min)) as Length;
}

/** The story as plain paragraphs, the way a reader sees it at this length. */
export function storyText(length: Length) {
  const paragraphs: string[][] = [];
  for (const paragraph of STORY) {
    const shown = paragraph.sentences.filter((sentence) => sentence.min <= length).map(sentenceText);
    if (!shown.length) continue;
    if (paragraph.breaksAt <= length || !paragraphs.length) paragraphs.push(shown);
    else paragraphs[paragraphs.length - 1].push(...shown);
  }
  return paragraphs.map((sentences) => sentences.join(' '));
}

export function wordCount(length: Length) {
  return storyText(length).join(' ').split(/\s+/).filter(Boolean).length;
}

function sentenceKeys(test: (sentence: Sentence) => boolean) {
  const keys: string[] = [];
  STORY.forEach((paragraph, p) => paragraph.sentences.forEach((sentence, s) => {
    if (test(sentence)) keys.push(`${p}.${s}`);
  }));
  return keys;
}

/** Keys ("paragraph.sentence") of the sentence that ends the story at each
 *  length, where the end mark sits. */
export function endKeys() {
  return LENGTHS.map(({ value }) => sentenceKeys((sentence) => sentence.min <= value).at(-1)!);
}

/** The sentences a move between two lengths takes out or puts back. */
export function changedKeys(from: Length, to: Length) {
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  return sentenceKeys((sentence) => sentence.min > low && sentence.min <= high);
}
