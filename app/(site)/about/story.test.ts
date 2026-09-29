import test from 'node:test';
import assert from 'node:assert/strict';
import { changedKeys, endKeys, LENGTHS, STORY, sentenceText, storyText, wordCount } from './story';

const sentencesAt = (length: 1 | 2 | 3) =>
  STORY.flatMap((paragraph) => paragraph.sentences.filter((sentence) => sentence.min <= length).map(sentenceText));

test('every version opens with the same line and adds only to the one below it', () => {
  const short = sentencesAt(1);
  const medium = sentencesAt(2);
  const long = sentencesAt(3);
  assert.equal(short[0], long[0]);
  assert.deepEqual(medium.filter((sentence) => short.includes(sentence)), short);
  assert.deepEqual(long.filter((sentence) => medium.includes(sentence)), medium);
  assert.ok(wordCount(1) < wordCount(2) && wordCount(2) < wordCount(3));
});

test('the copy has no dashes standing in for punctuation', () => {
  for (const { value } of LENGTHS) {
    for (const paragraph of storyText(value)) assert.doesNotMatch(paragraph, /[\u2013\u2014]|\s-\s/);
  }
});

test('links point at pages on this site, with the trailing slash it uses', () => {
  for (const paragraph of STORY) {
    for (const sentence of paragraph.sentences) {
      for (const piece of sentence.pieces) {
        if (typeof piece === 'string') continue;
        assert.match(piece.href, /^\/[a-z0-9/-]*\/$/);
      }
    }
  }
});

test('the end mark sits on the last sentence of each version', () => {
  const [short, medium, long] = endKeys();
  assert.equal(short, '6.0');
  assert.equal(medium, '6.1');
  assert.equal(long, '7.0');
});

test('moving between lengths touches only the sentences that differ', () => {
  const keys = (length: 1 | 2 | 3) =>
    STORY.flatMap((paragraph, p) =>
      paragraph.sentences.flatMap((sentence, s) => (sentence.min <= length ? [`${p}.${s}`] : [])));
  assert.deepEqual(changedKeys(3, 1), keys(3).filter((key) => !keys(1).includes(key)));
  assert.deepEqual(changedKeys(1, 3), changedKeys(3, 1));
  assert.deepEqual(changedKeys(2, 3), keys(3).filter((key) => !keys(2).includes(key)));
  assert.deepEqual(changedKeys(2, 2), []);
});
