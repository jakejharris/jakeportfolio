// What may not appear in the public facts of a GLM release, wherever it sits in the file.
import { readFileSync } from 'node:fs';
import { namedWord } from './public-text.mjs';

const RULES = [
  // A source's own terms are quoted verbatim, dashes and all; every other text is ours.
  [/\u2014/, 'an em dash', path => path.endsWith('_verbatim')],
  [/\/home\/|~\/|\/tmp\/|\/mnt\/|\bruntime\//, 'a local path'],
  // Four dotted numbers, one of them 10 or more: 10.0.0.2 is an address, while 0.3.6.2 is a version.
  // Loopback names no machine of ours, so a sentence may say the server listens on 127.0.0.1.
  [/\b(?!127\.0\.0\.1\b)(?=(?:\d{1,3}\.){3}\d{1,3}\b)(?:\d{1,3}\.){0,3}\d{2,3}\b/, 'an IP address'],
  [/\b[\w-]+\.local\b/i, 'a local host name'],
  [/\bspark\d\b/i, 'a host name'],
  [/\brc\.?\d/i, 'a release-candidate label'],
  [/\b(?:lane|scout|pane)s?\b/i, 'internal process wording'],
  [/\b(?:spark|release|frontend|cards|docs|packaging|site) leads?\b/i, 'an internal role'],
  [/\b(?:not|never) (?:yet )?(?:publishable|for publication|to be published)|\bunpublishable\b|\bdo not publish\b|\binternal only\b/i, 'a not-for-publication note'],
  // A marker other than an unfilled slot or a held figure ({{CHECK: ...}}, {{TODO}}) is a note to the release, never copy.
  [/\{\{(?!TBD\b|HOLD\b)[A-Z]+\b[^}]*\}\}/, 'a review marker'],
  // An upper-case letter and digits as a word: internal lever and lane codes such as E2 or K1.
  // RigMark's own output labels its concurrency rounds C1, C2 and C4, so its blocks and rows are exempt.
  // A code inside a hyphenated product name (DeepSeek-V4.1) is part of the name.
  [/(?<![-\w])[A-Z]\d+\b/, 'an internal code', path => /^rigmark(_rows)?[.[]/.test(path)],
  // RigMark's own prose time to first token for v2.0.1 marks the first reasoning token, not visible text,
  // so it is never published: not its figure, and not any time given for the first reasoning token.
  [/(?<![\d.])0\.293(?!\d)/, "RigMark's reasoning-token prose time to first token"],
  [/\b\d+(?:\.\d+)?\s?s\b[^.;]*\bfirst reasoning token|\bfirst reasoning token\b[^.;]*?\b\d+(?:\.\d+)?\s?s\b/i, 'a time to the first reasoning token'],
];

/**
 * The release's public copy rules (RELEASE-FACTS public_copy_rules), which the sync mirrors into
 * glm-copy-rules.json, checked one sentence at a time:
 * - claims: uniqueness phrasing ("is the first", "the only recipe") about the Sparks, TP3, the engine or the release;
 * - comparisons: a third-party build or engine named with a comparison word ("faster than", "unlike", "lacks");
 * - provenance: a sentence saying where something comes from ("a fork of", "based on") that names
 *   TensorFold without "TensorFold 0.3.6.2".
 * An allow_patterns entry exempts a sentence it matches (case-sensitive) from the rules it lists; an
 * allow_sentences entry exempts that exact sentence, from the rules it lists or, written as a bare string,
 * from all. An entry scoped to surfaces that are not this site (docs/OPERATIONS.md) does not apply here.
 * check-glm-facts refuses a stale mirror.
 */
export const COPY_RULE_KEYS = ['claim_tokens_regex', 'claim_subject_regex', 'comparison_target_regex', 'comparison_word_regex', 'provenance_origin_regex', 'allow_sentences', 'allow_patterns'];
export const COPY_RULES = JSON.parse(readFileSync(new URL('./glm-copy-rules.json', import.meta.url), 'utf8'));
/** The rule keys of a public_copy_rules block, in the mirror's order. */
export const copyRulesOf = rules => Object.fromEntries(COPY_RULE_KEYS.filter(key => rules?.[key] !== undefined).map(key => [key, rules[key]]));

const compiled = new WeakMap();
function copyChecks(rules) {
  if (!compiled.has(rules)) {
    const pattern = key => (typeof rules[key] === 'string' ? new RegExp(rules[key], 'i') : null);
    const [tokens, subject, target, word, origin] = COPY_RULE_KEYS.slice(0, 5).map(pattern);
    compiled.set(rules, {
      allow: (rules.allow_patterns ?? []).map(entry => [new RegExp(entry.regex), entry.rules ?? []]),
      sentences: (rules.allow_sentences ?? [])
        .map(entry => (typeof entry === 'string' ? { sentence: entry } : entry))
        .filter(entry => typeof entry?.sentence === 'string' && (!Array.isArray(entry.surfaces) || entry.surfaces.some(surface => /jakejh\.com/i.test(surface))))
        .map(entry => [entry.sentence, Array.isArray(entry.rules) ? entry.rules : ['claims', 'comparisons', 'provenance']]),
      checks: [
        ['claims', 'a first/only/unique claim', sentence => tokens?.test(sentence) && subject?.test(sentence)],
        ['comparisons', 'a comparison with a third-party build or engine', sentence => target?.test(sentence) && word?.test(sentence)],
        ['provenance', 'an origin naming TensorFold without "TensorFold 0.3.6.2"', sentence => origin?.test(sentence) && /TensorFold/i.test(sentence) && !sentence.includes('TensorFold 0.3.6.2')],
      ],
    });
  }
  return compiled.get(rules);
}

/** Every sentence of text that breaks one of the release's copy rules, as `what in "sentence"`. */
export function copyRuleIssues(text, rules = COPY_RULES) {
  const { allow, sentences, checks } = copyChecks(rules);
  return text.split(/(?<=[.!?])\s+|\n+/).flatMap(sentence => {
    const exempt = new Set([
      ...allow.filter(([pattern]) => pattern.test(sentence)).flatMap(([, names]) => names),
      ...sentences.filter(([allowed]) => allowed === sentence).flatMap(([, names]) => names),
    ]);
    return checks.filter(([name, , fails]) => !exempt.has(name) && fails(sentence)).map(([, what]) => `${what} in ${JSON.stringify(sentence)}`);
  });
}

/** Keys whose values are codes by design and are never printed as copy. */
const CODE_KEYS = new Set(['runnability.level_reached']);

/** Every public-text problem in value, as "path: what". */
export function publicIssues(value, path = '', rules = COPY_RULES) {
  if (typeof value === 'string') {
    if (CODE_KEYS.has(path)) return [];
    const issues = RULES.filter(([pattern, , exempt]) => !exempt?.(path) && pattern.test(value)).map(([, what]) => `${path}: ${what} in ${JSON.stringify(value)}`);
    for (const issue of copyRuleIssues(value, rules)) issues.push(`${path}: ${issue}`);
    const name = namedWord(value);
    if (name) issues.push(`${path}: an internal name in ${JSON.stringify(value)}`);
    return issues;
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => publicIssues(item, `${path}[${index}]`, rules));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => publicIssues(item, path ? `${path}.${key}` : key, rules));
  return [];
}
