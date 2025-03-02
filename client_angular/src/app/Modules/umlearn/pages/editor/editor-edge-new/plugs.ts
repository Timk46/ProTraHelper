/* USEFUL INFORMATION TO CREATE NEW PLUGS:
  Plug svgs:

  Diamond:
  <svg width="32" height="32" viewBox="0 0 32 32" style="transform-origin: center; transform: rotate(0deg)">
    <polygon points="16,16 24,10 32,16 24,22" style="fill: black;"/>
    <polygon points="16,16 24,10 32,16 24,22" style="fill: orange ; transform-origin: 75% 50%; transform: scale(0.5)"/>
  </svg>

  Arrow1:
  <svg width="32" height="32" viewBox="0 0 32 32" style="transform-origin: center; transform: rotate(0deg)">
    <polygon points="16,16 24,10 26,12 21,16 26,20 24,22" style="fill: black;"/>
    <!--               l     o     o2    l2    u2    u              -->
  </svg>

  Arrow2:
  <svg width="32" height="32" viewBox="0 0 32 32" style="transform-origin: center; transform: rotate(0deg)">
    <polygon points="16,16 24,10 24,22" style="fill: black;"/>
    <polygon points="16,16 24,10 24,22" style="fill: orange ; transform-origin: 66% 50%; transform: scale(0.5)"/>
  </svg>

  Important are the viewBox, width, height and the polygon points. The second polygon is just an outline example.
  The viewBox should be quadratic to ensure a correct rotation.
  The pit is the center of the svg. The box is bigger to make sure the svg is not cut off when rotated.
*/

export enum availablePlugs {
  DIAMOND = 'diamond',
  ARROW1 = 'arrow1',
  TRIANGLE = 'triangle',
}

export interface Plug {
  width: number;
  height: number;
  direction: number;
  viewBox: string;
  lineOffset: number; // the x-offset of the line from the center of the plug
  scaleOrigin?: string; // the middle of the plug for scaling; if not set, the plug can not have an outline
  polygon?: string;
  path?: string;
}

export interface PlugOptions {
  plug: availablePlugs,
  color?: string,
  scale?: number,
  outline?: number,
  outlineColor?: string,
}

export const plugs: { [key: string]: Plug } = {
  [availablePlugs.DIAMOND]: {
    width: 32,
    height: 32,
    direction: -90,
    lineOffset: 8,
    scaleOrigin: '75% 50%',
    viewBox: '0 0 32 32',
    polygon: '16,16 24,10 32,16 24,22',
  },
  [availablePlugs.ARROW1]: {
    width: 32,
    height: 32,
    direction: -90,
    lineOffset: 5,
    viewBox: '0 0 32 32',
    polygon: '16,16 24,10 26,12 21,16 26,20 24,22',
  },
  [availablePlugs.TRIANGLE]: {
    width: 32,
    height: 32,
    direction: -90,
    lineOffset: 8,
    scaleOrigin: '66% 50%',
    viewBox: '0 0 32 32',
    polygon: '16,16 24,10 24,22',
  },
}
