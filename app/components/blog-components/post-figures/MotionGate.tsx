'use client';

import { useEffect } from 'react';

import { startMotionGate } from '@/app/lib/motion-gate';

/**
 * Mounted once per post that has a moving figure. Runs the figures' CSS
 * motion only while each is in view and the page is visible. Renders nothing.
 */
export default function MotionGate() {
  useEffect(() => startMotionGate(), []);
  return null;
}
