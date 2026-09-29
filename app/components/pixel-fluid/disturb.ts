// The water listens for the rest of the page. The appearance dock splashes it
// when the theme flips and pours an accent in from the swatch that picked it;
// played fast, its pours stack up and leave their color in the water. Pages
// without the water simply have no listener.

export const FLUID_DISTURB_EVENT = 'pixel-fluid:disturb';

export interface FluidDisturbance {
  /** Viewport px. */
  x: number;
  y: number;
  /** A new accent is about to land: spread it from here. */
  dye?: boolean;
  /** With `dye`: the accent already showing, poured again. Nothing changes on <html>. */
  again?: boolean;
  /** With `dye`: how fast the dock is being played, 0 to 1. */
  heat?: number;
}

export function disturbWater(detail: FluidDisturbance) {
  window.dispatchEvent(new CustomEvent(FLUID_DISTURB_EVENT, { detail }));
}
