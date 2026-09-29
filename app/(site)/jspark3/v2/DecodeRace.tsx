import React from 'react';
import DecodeRaceClient from './DecodeRaceClient';
import RACE, { raceCaption } from './decode-race-data';
import { Marked, Ph } from '../Placeholder';
import { GLM_COPY, RELEASE } from '../release-copy';

/**
 * The decode race: each decode row of a serving start grows at its measured rate for the same few
 * seconds, one strand per concurrent stream, on one scale shared by every start. Its data and copy
 * are built here on the server and handed to the browser part, so the release file and its copy stay
 * out of the page's first load.
 */
export default function DecodeRace() {
  if (!RACE.initial) return null;
  const labels = Object.fromEntries(RACE.starts.map(start => [start.key, <Marked key={start.key} text={start.label} />]));
  const captions = Object.fromEntries(RACE.starts.map(start => [start.key, <Marked key={start.key} text={RELEASE === 'v1.8.4' && start.key === 'current' ? raceCaption(start).replace(/sweeps$/, 'code repeats') : raceCaption(start)} />]));
  return <DecodeRaceClient race={RACE} labels={labels} captions={captions} installNote={GLM_COPY.install.note} note={<Ph>Placeholder lanes, no data yet</Ph>} />;
}
