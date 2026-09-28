// The water listens for the rest of the page. The appearance dock splashes it
// when the theme flips and pours a new accent in from the swatch that picked
// it. Pages without the water simply have no listener.

export const FLUID_DISTURB_EVENT = 'pixel-fluid:disturb';

export interface FluidDisturbance {
  /** Viewport px. */
  x: number;
  y: number;
  /** A new accent is about to land: spread it from here. */
  dye?: boolean;
}

export function disturbWater(detail: FluidDisturbance) {
  window.dispatchEvent(new CustomEvent(FLUID_DISTURB_EVENT, { detail }));
}
