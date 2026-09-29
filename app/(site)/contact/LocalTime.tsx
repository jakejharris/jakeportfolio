"use client";

import { useEffect, useState } from "react";

// Jake's time of day, so a visitor can tell whether it's morning or midnight
// where he is. It only appears once the page runs in a browser, since the
// server can't know when the page will be read.

const FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h12",
});

function chicagoTime(date: Date) {
  const parts = Object.fromEntries(FORMAT.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()}`;
}

export default function LocalTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const now = new Date();
      setTime(chicagoTime(now));
      // Wake just after the next minute turns.
      timer = window.setTimeout(tick, 60_000 - (now.getTime() % 60_000) + 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  if (!time) return <>.</>;
  return (
    <>
      , where it’s <time className="contact-time">{time}</time>.
    </>
  );
}
