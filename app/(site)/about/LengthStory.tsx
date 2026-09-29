"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import TransitionLink from "../../components/TransitionLink";
import {
  changedKeys,
  DEFAULT_LENGTH,
  endKeys,
  LENGTHS,
  paragraphMin,
  STORY,
  wordCount,
  type Length,
  type Piece,
} from "./story";

// The story at the length the reader picks. Shortening it strikes out the
// sentences that go, then closes the gap; lengthening it sets the returning
// sentences back in, lit for a moment so they are easy to find. Every pick
// cancels whatever the last one was still doing, so rapid picks always end on
// the last length chosen.

const RESIZE_MS = 340;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const WORDS = Object.fromEntries(LENGTHS.map(({ value }) => [value, wordCount(value)])) as Record<Length, number>;
const LABELS = Object.fromEntries(LENGTHS.map(({ value, label }) => [value, label])) as Record<Length, string>;
const ENDS = endKeys();

function Pieces({ pieces, ends }: { pieces: Piece[]; ends: boolean }) {
  const last = pieces.length - 1;
  return (
    <>
      {pieces.map((piece, index) => {
        if (typeof piece !== "string") {
          // Like the homepage's post links, these load when tapped rather
          // than pulling whole pages in behind a bio.
          return (
            <TransitionLink key={index} href={piece.href} scroll={true} prefetch={false} className="story-link">
              {piece.text}
            </TransitionLink>
          );
        }
        if (!ends || index !== last) return <Fragment key={index}>{piece}</Fragment>;
        // The end mark rides the last word, so it never wraps onto a line by
        // itself.
        const cut = piece.lastIndexOf(" ") + 1;
        return (
          <Fragment key={index}>
            {piece.slice(0, cut)}
            <span className="story-tail">
              {piece.slice(cut)}
              <span className="story-end" aria-hidden="true" />
            </span>
          </Fragment>
        );
      })}
    </>
  );
}

export default function LengthStory() {
  const name = useId();
  const storyRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef<Length>(DEFAULT_LENGTH);
  const pickRef = useRef(0);
  const resizeRef = useRef<Animation | null>(null);
  const [selected, setSelected] = useState<Length>(DEFAULT_LENGTH);
  const [announcement, setAnnouncement] = useState("");

  const mark = (keys: string[], className: string) => {
    const elements = keys.flatMap((key) => {
      const element = storyRef.current?.querySelector(`[data-key="${key}"]`);
      return element ? [element] : [];
    });
    elements.forEach((element) => element.classList.add(className));
    return elements;
  };

  const show = (length: Length) => {
    const story = storyRef.current;
    if (!story) return;
    story.dataset.length = String(length);
    shownRef.current = length;
    setAnnouncement(`${LABELS[length]} version, ${WORDS[length]} words`);
  };

  // The text reflows at once; the box around it eases from the height it had
  // on screen to its new one, so the page below follows smoothly.
  const resizeFrom = (before: number) => {
    const story = storyRef.current;
    resizeRef.current?.cancel();
    resizeRef.current = null;
    if (!story || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const after = story.offsetHeight;
    if (Math.abs(before - after) < 1) return;
    resizeRef.current = story.animate(
      [
        { height: `${before}px`, overflow: "hidden" },
        { height: `${after}px`, overflow: "hidden" },
      ],
      { duration: RESIZE_MS, easing: EASE }
    );
  };

  const request = (length: Length) => {
    const story = storyRef.current;
    if (!story) return;
    const pick = ++pickRef.current;
    // Mid-resize, this is the height on screen, not the text's own.
    const onScreen = story.offsetHeight;
    story.querySelectorAll(".is-cut, .is-new").forEach((element) => element.classList.remove("is-cut", "is-new"));
    setSelected(length);

    const from = shownRef.current;
    if (length > from) {
      show(length);
      // Restart the light even on sentences that were lit a moment ago.
      void story.offsetWidth;
      mark(changedKeys(from, length), "is-new");
    }
    resizeFrom(onScreen);
    if (length >= from) return;

    // The gap closes once every strike is drawn. Under reduced motion there
    // is no strike, so it closes at once.
    const cut = mark(changedKeys(from, length), "is-cut");
    const strikes = cut.flatMap((element) => element.getAnimations().map((animation) => animation.finished));
    Promise.allSettled(strikes).then(() => {
      if (pick !== pickRef.current) return;
      const before = story.offsetHeight;
      cut.forEach((element) => element.classList.remove("is-cut"));
      show(length);
      resizeFrom(before);
    });
  };

  useEffect(() => {
    // A pick made before the page finished loading still counts.
    const checked = storyRef.current?.parentElement?.querySelector<HTMLInputElement>("input:checked");
    const early = Number(checked?.value) as Length;
    if (early && early !== shownRef.current) request(early);
    return () => {
      pickRef.current += 1;
      resizeRef.current?.cancel();
    };
    // Runs once: request only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="story-block">
      <div className="story-controls">
        <fieldset className="story-lengths">
          <legend className="sr-only">Length of the story</legend>
          {LENGTHS.map(({ value, label }) => (
            <label key={value} className="story-length">
              <input
                type="radio"
                name={name}
                value={value}
                checked={selected === value}
                onChange={() => request(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <p className="story-count">{WORDS[selected]} words</p>
      </div>

      <div ref={storyRef} className="story" data-length={DEFAULT_LENGTH}>
        {STORY.map((paragraph, p) => (
          <Fragment key={p}>
            {p > 0 ? " " : null}
            <p data-min={paragraphMin(paragraph)} data-break={paragraph.breaksAt}>
              {paragraph.sentences.map((sentence, s) => {
                const key = `${p}.${s}`;
                const ends = LENGTHS.filter((_, index) => ENDS[index] === key).map(({ value }) => value);
                return (
                  <Fragment key={key}>
                    {s > 0 ? " " : null}
                    <span
                      className="story-sentence"
                      data-key={key}
                      data-min={sentence.min}
                      data-end={ends.length ? ends.join(" ") : undefined}
                    >
                      <Pieces pieces={sentence.pieces} ends={ends.length > 0} />
                    </span>
                  </Fragment>
                );
              })}
            </p>
          </Fragment>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
