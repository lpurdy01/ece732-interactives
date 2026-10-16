/**
 * The two pictures that sit above each interactive: the device, and the
 * signal graph of the device.
 *
 * A slider named R_p means nothing until you can see which resistor it is and
 * where that resistor enters the algebra. So every figure here tags its parts
 * with `data-sym`, matching the tags on the sliders, and `figure-sync.ts`
 * lights up all of them together.
 *
 * Schematics use `schematic.ts`; block diagrams reuse `diagram-svg.ts`, the
 * same renderer the decomposition practice problems are drawn with, so the two
 * halves of the site speak one visual language.
 *
 * Nothing here is traced from a lecture slide. These are the standard textbook
 * drawings of a series supply, a DC motor and a mass-spring-damper, laid out
 * to line up with the controls underneath them.
 */

import type { Schematic } from './schematic';

const frac = (num: string, den: string) => ({ frac: [num, den] });

export interface BlockFigure {
  viewBox: [number, number, number, number];
  elements: any[];
  wires: any[];
  labels?: any[];
  /** Display markup for a label whose `sym` is a plain key, e.g. Rhat -> R̂_{p}. */
  symbols?: Record<string, { svg: string }>;
  title: string;
}

export interface FigurePair {
  physical?: Schematic;
  block: BlockFigure;
  /** One line under each panel saying what it is for. */
  physicalCaption?: string;
  blockCaption: string;
}

/* ------------------------------------------------------------------ */
/* W3L1 -- current-source supply                                       */
/* ------------------------------------------------------------------ */

const dsPhysical: Schematic = {
  title: 'Current-regulated supply feeding a load that sets the terminal voltage',
  viewBox: [0, 0, 640, 240],
  boxes: [{ x: 306, y: 22, w: 168, h: 96, label: 'emulated by the controller' }],
  wires: [
    { pts: [[60, 60], [60, 101]] }, { pts: [[60, 149], [60, 190]] },
    { pts: [[60, 60], [126, 60]] }, { pts: [[174, 60], [216, 60]] },
    { pts: [[264, 60], [326, 60]] }, { pts: [[374, 60], [406, 60]] },
    { pts: [[454, 60], [560, 60]] },
    { pts: [[560, 60], [560, 101]] }, { pts: [[560, 149], [560, 190]] },
    { pts: [[60, 190], [560, 190]] },
  ],
  parts: [
    { kind: 'isrc', x: 60, y: 125, dir: 'v', flow: -1, label: 'i_{cmd}', side: -1 },
    { kind: 'R', x: 150, y: 60, label: 'R_{p}', sym: 'Rp', value: true, side: -1 },
    { kind: 'L', x: 240, y: 60, label: 'L_{p}', sym: 'Lp', value: true, side: -1 },
    { kind: 'R', x: 350, y: 60, label: 'R_{a}', sym: 'Ra', value: true, side: 1 },
    { kind: 'L', x: 430, y: 60, label: 'L_{a}', sym: 'La', value: true, side: 1 },
    { kind: 'vsrc', x: 560, y: 125, dir: 'v', flow: -1, label: 'e_{o}', sym: 'eo', side: 1 },
  ],
  markers: [
    { kind: 'current', x: 502, y: 60, len: 34, flow: 1, label: 'i_{o}', sym: 'io', side: -1 },
    { kind: 'ground', x: 310, y: 190 },
  ],
  labels: [
    { x: 60, y: 222, text: 'commanded current', small: true },
    { x: 634, y: 222, text: 'load voltage = the disturbance', anchor: 'end', small: true },
  ],
};

const dsBlock: BlockFigure = {
  title: 'Current error driven by a voltage disturbance',
  viewBox: [0, 0, 620, 245],
  elements: [
    { kind: 'sum', x: 110, y: 90 },
    { kind: 'fn', x: 235, y: 90, w: 84, h: 44, label: frac('1', 'L_{p}+L_{a}'), sym: 'Lp La' },
    { kind: 'fn', x: 350, y: 90, w: 46, label: frac('1', 's') },
    { kind: 'gain', x: 280, y: 200, w: 84, label: 'R_{p}+R_{a}', sym: 'Rp Ra' },
  ],
  wires: [
    { pts: [[20, 90], [97, 90]], sign: '-' },
    { pts: [[123, 90], [191, 90]] },
    { pts: [[277, 90], [325, 90]] },
    { pts: [[373, 90], [600, 90]] },
    { pts: [[480, 90], [480, 200], [324, 200]], tap: true },
    { pts: [[238, 200], [110, 200], [110, 103]], sign: '-' },
  ],
  labels: [
    { sym: 'e_{o}', tag: 'eo', x: 24, y: 80, anchor: 'start' },
    { sym: 'di_{o}/dt', x: 301, y: 80 },
    { sym: 'i_{o}', tag: 'io', x: 560, y: 80 },
    { sym: '(R_{p}+R_{a}) i_{o}', x: 400, y: 192 },
  ],
};

export const dynamicStiffnessFigures: FigurePair = {
  physical: dsPhysical,
  block: dsBlock,
  physicalCaption: 'Rₐ and Lₐ sit in series with Rₚ and Lₚ because that is exactly what the current controller makes the supply behave like.',
  blockCaption: 'One loop. The disturbance eₒ enters where the resistive drop does, which is why they add.',
};

/* ------------------------------------------------------------------ */
/* W3L2 -- voltage-source supply with output capacitance               */
/* ------------------------------------------------------------------ */

const vsPhysical: Schematic = {
  title: 'Voltage-regulated supply with output capacitance, feeding a load current',
  viewBox: [0, 0, 640, 255],
  wires: [
    { pts: [[60, 75], [60, 116]] }, { pts: [[60, 164], [60, 205]] },
    { pts: [[60, 75], [141, 75]] }, { pts: [[189, 75], [236, 75]] },
    { pts: [[284, 75], [520, 75]] },
    { pts: [[370, 75], [370, 116]] }, { pts: [[370, 164], [370, 205]] },
    { pts: [[470, 75], [470, 116]] }, { pts: [[470, 164], [470, 205]] },
    { pts: [[60, 205], [520, 205]] },
  ],
  parts: [
    { kind: 'vsrc', x: 60, y: 140, dir: 'v', flow: -1, label: 'e_{cmd}', side: -1 },
    { kind: 'L', x: 165, y: 75, label: 'L_{p}', sym: 'Lp', value: true, side: -1 },
    { kind: 'R', x: 260, y: 75, label: 'R_{p}', sym: 'Rp', value: true, side: -1 },
    { kind: 'C', x: 370, y: 140, dir: 'v', label: 'C_{p}', sym: 'Cp', value: true, side: -1 },
    { kind: 'isrc', x: 470, y: 140, dir: 'v', flow: 1, label: 'i_{o}', sym: 'io', side: 1 },
  ],
  markers: [
    { kind: 'current', x: 320, y: 75, len: 30, flow: 1, label: 'i', sym: 'i', side: -1 },
    { kind: 'volt', x: 520, y: 140, dir: 'v', len: 130, flow: 1, label: 'e_{o}', sym: 'eo', side: 1 },
    { kind: 'node', x: 370, y: 75 }, { kind: 'node', x: 470, y: 75 },
    { kind: 'ground', x: 215, y: 205 },
  ],
  labels: [
    { x: 60, y: 238, text: 'regulated supply', small: true },
    { x: 634, y: 238, text: 'load current = the disturbance', anchor: 'end', small: true },
  ],
};

const vsBlock: BlockFigure = {
  title: 'Two states: inductor current and capacitor voltage',
  viewBox: [0, 0, 660, 268],
  elements: [
    { kind: 'sum', x: 90, y: 80 },
    { kind: 'fn', x: 175, y: 80, w: 54, label: frac('1', 'L_{p}'), sym: 'Lp' },
    { kind: 'fn', x: 265, y: 80, w: 46, label: frac('1', 's') },
    { kind: 'sum', x: 355, y: 80 },
    { kind: 'fn', x: 440, y: 80, w: 54, label: frac('1', 'C_{p}'), sym: 'Cp' },
    { kind: 'fn', x: 530, y: 80, w: 46, label: frac('1', 's') },
    { kind: 'gain', x: 200, y: 25, w: 46, label: 'R_{p}', sym: 'Rp' },
  ],
  wires: [
    { pts: [[20, 80], [77, 80]], sign: '+' },
    { pts: [[103, 80], [146, 80]] },
    { pts: [[202, 80], [240, 80]] },
    { pts: [[288, 80], [342, 80]] },
    { pts: [[355, 18], [355, 67]], sign: '-' },
    { pts: [[368, 80], [411, 80]] },
    { pts: [[467, 80], [505, 80]] },
    { pts: [[553, 80], [640, 80]] },
    { pts: [[310, 80], [310, 25], [225, 25]], tap: true },
    { pts: [[177, 25], [90, 25], [90, 67]], sign: '-' },
    { pts: [[590, 80], [590, 248], [90, 248], [90, 93]], tap: true, sign: '-' },
  ],
  labels: [
    { sym: 'e_{cmd}', x: 24, y: 70, anchor: 'start' },
    { sym: 'R_{p} i', x: 140, y: 16 },
    { sym: 'i', tag: 'i', x: 322, y: 70 },
    { sym: 'i_{o}', tag: 'io', x: 365, y: 30, anchor: 'start' },
    { sym: 'e_{o}', tag: 'eo', x: 617, y: 70 },
  ],
};

export const voltageSourceFigures: FigurePair = {
  physical: vsPhysical,
  block: vsBlock,
  physicalCaption: 'Cₚ holds the terminal voltage up, and Lₚ and Cₚ together resonate. The notch is that resonance seen from the load.',
  blockCaption: 'Two integrators, so two states. Rₚ appears only in the inner loop, which is why it damps the ring but cannot raise the shelf.',
};

/* ------------------------------------------------------------------ */
/* W3L2 -- eigenvalue migration vs root locus                          */
/* ------------------------------------------------------------------ */

const evmPhysical: Schematic = {
  title: 'The same supply with a resistive load; the load resistance is a physical parameter',
  viewBox: [0, 0, 640, 255],
  wires: vsPhysical.wires,
  parts: [
    { kind: 'vsrc', x: 60, y: 140, dir: 'v', flow: -1, label: 'e_{i}', side: -1 },
    { kind: 'L', x: 165, y: 75, label: 'L_{p}', sym: 'Lp', value: true, side: -1 },
    { kind: 'R', x: 260, y: 75, label: 'R_{p}', sym: 'Rp', value: true, side: -1 },
    { kind: 'C', x: 370, y: 140, dir: 'v', label: 'C_{p}', sym: 'Cp', value: true, side: -1 },
    { kind: 'R', x: 470, y: 140, dir: 'v', label: 'R_{eq}', sym: 'Req', value: true, side: 1 },
  ],
  markers: [
    { kind: 'current', x: 320, y: 75, len: 30, flow: 1, label: 'i', sym: 'i', side: -1 },
    { kind: 'volt', x: 520, y: 140, dir: 'v', len: 130, flow: 1, label: 'e_{o}', sym: 'eo', side: 1 },
    { kind: 'node', x: 370, y: 75 }, { kind: 'node', x: 470, y: 75 },
    { kind: 'ground', x: 215, y: 205 },
  ],
  labels: [
    { x: 60, y: 238, text: 'supply', small: true },
    { x: 634, y: 238, text: 'load resistance — a component, not a gain', anchor: 'end', small: true },
  ],
};

const evmBlock: BlockFigure = {
  title: 'R_eq inside the loop: a load, not a tuning knob',
  viewBox: [0, 0, 660, 268],
  elements: [
    { kind: 'sum', x: 90, y: 80 },
    { kind: 'fn', x: 175, y: 80, w: 54, label: frac('1', 'L_{p}'), sym: 'Lp' },
    { kind: 'fn', x: 265, y: 80, w: 46, label: frac('1', 's') },
    { kind: 'sum', x: 355, y: 80 },
    { kind: 'fn', x: 440, y: 80, w: 54, label: frac('1', 'C_{p}'), sym: 'Cp' },
    { kind: 'fn', x: 530, y: 80, w: 46, label: frac('1', 's') },
    { kind: 'gain', x: 200, y: 25, w: 46, label: 'R_{p}', sym: 'Rp' },
    { kind: 'fn', x: 440, y: 185, w: 62, label: frac('1', 'R_{eq}'), sym: 'Req' },
  ],
  wires: [
    { pts: [[20, 80], [77, 80]], sign: '+' },
    { pts: [[103, 80], [146, 80]] },
    { pts: [[202, 80], [240, 80]] },
    { pts: [[288, 80], [342, 80]] },
    { pts: [[368, 80], [411, 80]] },
    { pts: [[467, 80], [505, 80]] },
    { pts: [[553, 80], [640, 80]] },
    { pts: [[310, 80], [310, 25], [225, 25]], tap: true },
    { pts: [[177, 25], [90, 25], [90, 67]], sign: '-' },
    { pts: [[560, 80], [560, 185], [473, 185]], tap: true },
    { pts: [[409, 185], [355, 185], [355, 93]], sign: '-' },
    { pts: [[600, 80], [600, 248], [90, 248], [90, 93]], tap: true, sign: '-' },
  ],
  labels: [
    { sym: 'e_{i}', x: 24, y: 70, anchor: 'start' },
    { sym: 'R_{p} i', x: 140, y: 16 },
    { sym: 'i', tag: 'i', x: 322, y: 70 },
    { sym: 'e_{o}', tag: 'eo', x: 617, y: 70 },
    { sym: 'e_{o}/R_{eq}', x: 300, y: 178 },
  ],
};

const locusBlock: BlockFigure = {
  title: 'A controller gain in front of a fixed plant',
  viewBox: [0, 0, 620, 220],
  elements: [
    { kind: 'sum', x: 110, y: 80 },
    { kind: 'gain', x: 210, y: 80, w: 50, label: 'K', sym: 'K' },
    { kind: 'fn', x: 360, y: 80, w: 150, h: 46, label: frac('1', 's^{2}+20s+50') },
  ],
  wires: [
    { pts: [[25, 80], [97, 80]], sign: '+' },
    { pts: [[123, 80], [183, 80]] },
    { pts: [[237, 80], [283, 80]] },
    { pts: [[437, 80], [600, 80]] },
    { pts: [[520, 80], [520, 190], [110, 190], [110, 93]], tap: true, sign: '-' },
  ],
  labels: [
    { sym: 'r', x: 30, y: 70, anchor: 'start' },
    { sym: 'y', tag: 'y', x: 565, y: 70 },
  ],
};

export const migrationFigures: FigurePair = {
  physical: evmPhysical,
  block: evmBlock,
  physicalCaption: 'The load resistance is whatever the supply happens to be driving. Nobody chose it to place a pole; it changes when the machine changes.',
  blockCaption: 'The load enters as a reciprocal, inside the loop, in one state equation only. Compare where K enters in the other mode.',
};

export const locusFigures: FigurePair = {
  block: locusBlock,
  blockCaption: 'K multiplies the whole forward path and nothing else. That single difference is what makes a locus a locus.',
};

/* ------------------------------------------------------------------ */
/* W4L1 -- DC motor                                                    */
/* ------------------------------------------------------------------ */

/** The motor drawing, shared by both week-4 tools; `extra` adds R_a in series. */
function motorSchematic(opts: { withRa: boolean }): Schematic {
  const ra = opts.withRa;
  // With R_a inserted the armature loop needs one more part, so the whole
  // electrical run shifts right rather than crowding the existing parts.
  const xL = ra ? 225 : 145;
  const xR = ra ? 315 : 240;
  const xEnd = ra ? 375 : 300;
  const shaft0 = ra ? 470 : 420;
  const discX = ra ? 525 : 480;
  const bX = ra ? 615 : 560;
  const tlX = ra ? 670 : 625;
  const shaft1 = ra ? 690 : 640;
  const width = ra ? 720 : 680;

  const wires: Schematic['wires'] = [
    { pts: [[55, 75], [55, 116]] }, { pts: [[55, 164], [55, 205]] },
    { pts: [[55, 75], [xL - 24, 75]] },
    { pts: [[xL + 24, 75], [xR - 24, 75]] },
    { pts: [[xR + 24, 75], [xEnd, 75]] },
    { pts: [[xEnd, 75], [xEnd, 116]] }, { pts: [[xEnd, 164], [xEnd, 205]] },
    { pts: [[55, 205], [xEnd, 205]] },
    { pts: [[shaft0, 140], [shaft1, 140]] },
    { pts: [[bX, 140], [bX, 152]] },
  ];
  if (ra) {
    wires.splice(2, 1,
      { pts: [[55, 75], [111, 75]] },
      { pts: [[159, 75], [xL - 24, 75]] });
  }

  const parts: Schematic['parts'] = [
    { kind: 'vsrc', x: 55, y: 140, dir: 'v', flow: -1, label: ra ? 'V_{cmd}' : 'V', sym: 'V', side: -1 },
    { kind: 'L', x: xL, y: 75, label: 'L_{p}', sym: 'Lp', value: true, side: -1 },
    { kind: 'R', x: xR, y: 75, label: 'R_{p}', sym: 'Rp', value: true, side: -1 },
    { kind: 'vsrc', x: xEnd, y: 140, dir: 'v', flow: -1, label: 'K_{e}ω', sym: 'K', side: 1 },
    { kind: 'disc', x: discX, y: 140, w: 30, label: 'J', sym: 'J', value: true },
    { kind: 'damper', x: bX, y: 180, dir: 'v', len: 56, label: 'b_{p}', sym: 'bp', value: true, side: 1 },
  ];
  if (ra) parts.splice(1, 0, { kind: 'R', x: 135, y: 75, label: 'R_{a}', sym: 'Ra', value: true, side: -1 });

  return {
    title: 'DC motor: armature circuit coupled to a rotating inertia',
    viewBox: [0, 0, width, 330],
    boxes: [{ x: 96, y: 44, w: width - 116, h: 250, label: 'DC motor' }],
    wires,
    parts,
    markers: [
      { kind: 'current', x: xEnd - 18, y: 75, len: 24, flow: 1, label: 'i', sym: 'i', side: -1 },
      { kind: 'ground', x: (55 + xEnd) / 2, y: 205 },
      { kind: 'hatch', x: bX, y: 208, dir: 'h', len: 56, side: 1 },
      { kind: 'torque', x: discX, y: 140, len: 42, flow: 1, label: 'ω', sym: 'w', side: -1 },
      { kind: 'torque', x: tlX, y: 140, len: 22, flow: -1, label: 'T_{L}', sym: 'TL', side: -1 },
      { kind: 'couple', x: (xEnd + shaft0) / 2 + 20, y: 232, dir: 'h', len: 120, flow: 1, label: 'K_{t} i', sym: 'K', side: -1 },
      { kind: 'couple', x: (xEnd + shaft0) / 2 + 20, y: 272, dir: 'h', len: 120, flow: -1, label: 'K_{e} ω', sym: 'K', side: -1 },
    ],
    labels: [
      { x: 55, y: 250, text: 'drive', small: true },
      { x: width - 6, y: 318, text: 'shaft speed is the response, T_{L} is the disturbance', anchor: 'end', small: true },
    ],
  };
}

const motorBlock: BlockFigure = {
  title: 'DC motor with its back-EMF loop',
  viewBox: [0, 0, 660, 235],
  elements: [
    { kind: 'sum', x: 90, y: 80 },
    { kind: 'fn', x: 200, y: 80, w: 116, h: 46, label: frac('1', 'L_{p}s+R_{p}'), sym: 'Lp Rp' },
    { kind: 'gain', x: 320, y: 80, w: 50, label: 'K_{t}', sym: 'K' },
    { kind: 'sum', x: 410, y: 80 },
    { kind: 'fn', x: 520, y: 80, w: 104, h: 46, label: frac('1', 'Js+b_{p}'), sym: 'J bp' },
    { kind: 'gain', x: 300, y: 195, w: 50, label: 'K_{e}', sym: 'K' },
  ],
  wires: [
    { pts: [[20, 80], [77, 80]], sign: '+' },
    { pts: [[103, 80], [140, 80]] },
    { pts: [[258, 80], [293, 80]] },
    { pts: [[347, 80], [397, 80]] },
    { pts: [[410, 16], [410, 67]], sign: '-' },
    { pts: [[423, 80], [466, 80]] },
    { pts: [[572, 80], [645, 80]] },
    { pts: [[610, 80], [610, 195], [327, 195]], tap: true },
    { pts: [[273, 195], [90, 195], [90, 93]], sign: '-' },
  ],
  labels: [
    { sym: 'V', tag: 'V', x: 26, y: 70, anchor: 'start' },
    { sym: 'i', tag: 'i', x: 276, y: 70 },
    { sym: 'T_{L}', tag: 'TL', x: 420, y: 26, anchor: 'start' },
    { sym: 'ω', tag: 'w', x: 596, y: 70 },
    { sym: 'K_{e}ω', x: 160, y: 187 },
  ],
};

export const motorFigures: FigurePair = {
  physical: motorSchematic({ withRa: false }),
  block: motorBlock,
  physicalCaption: 'Two coupled domains. Kₜ turns current into torque and Kₑ turns speed back into voltage — the same constant in SI, and the reason the two stiffnesses share a numerator.',
  blockCaption: 'The back-EMF path is a feedback loop that the motor builds itself. Nobody wired it; the physics did.',
};

/* ------------------------------------------------------------------ */
/* W4L2 -- state feedback on the motor                                 */
/* ------------------------------------------------------------------ */

const msfPhysical: Schematic = (() => {
  const base = motorSchematic({ withRa: true });
  return {
    ...base,
    title: 'The same motor with a current controller in the drive',
    viewBox: [0, 0, 720, 392],
    boxes: [
      ...(base.boxes ?? []),
      { x: 40, y: 312, w: 330, h: 62, label: 'controller' },
    ],
    markers: [
      ...(base.markers ?? []),
      // Into the drive, crossing the motor boundary: the controller adds a
      // voltage, it does not add a component.
      { kind: 'couple', x: 55, y: 260, dir: 'v', len: 97, flow: -1 },
    ],
    labels: [
      // The dashed correction arrow lands where the 'drive' caption sits on
      // the plain motor, and the arrow says it better anyway.
      ...(base.labels ?? []).filter((l) => l.text !== 'drive'),
      { x: 120, y: 352, text: '−R̂_{p} i', sym: 'Rhat' },
      { x: 222, y: 352, text: '+ K̂_{e} ω', sym: 'Khat' },
      { x: 330, y: 352, text: 'added', anchor: 'end', small: true },
    ],
  };
})();

const msfBlock: BlockFigure = {
  title: 'Motor with the controller feeding back the same two states',
  viewBox: [0, 0, 700, 360],
  elements: [
    { kind: 'sum', x: 70, y: 80 },
    { kind: 'sum', x: 140, y: 80 },
    { kind: 'fn', x: 245, y: 80, w: 124, h: 46, label: frac('1', 'L_{p}s+R_{p}+R_{a}'), sym: 'Lp Rp Ra' },
    { kind: 'gain', x: 370, y: 80, w: 50, label: 'K_{t}', sym: 'K' },
    { kind: 'sum', x: 455, y: 80 },
    { kind: 'fn', x: 565, y: 80, w: 104, h: 46, label: frac('1', 'Js+b_{p}'), sym: 'J bp' },
    { kind: 'gain', x: 330, y: 175, w: 50, label: 'K_{e}', sym: 'K' },
    { kind: 'sum', x: 140, y: 270 },
    { kind: 'gain', x: 250, y: 240, w: 64, label: 'R̂_{p}', sym: 'Rhat' },
    { kind: 'gain', x: 250, y: 300, w: 64, label: 'K̂_{e}', sym: 'Khat' },
  ],
  wires: [
    { pts: [[15, 80], [57, 80]], sign: '+' },
    { pts: [[83, 80], [127, 80]], sign: '+' },
    { pts: [[153, 80], [181, 80]] },
    { pts: [[309, 80], [343, 80]] },
    { pts: [[397, 80], [442, 80]] },
    { pts: [[455, 16], [455, 67]], sign: '-' },
    { pts: [[468, 80], [511, 80]] },
    { pts: [[617, 80], [685, 80]] },
    { pts: [[640, 80], [640, 300], [284, 300]], tap: true },
    { pts: [[640, 175], [357, 175]], tap: true },
    { pts: [[303, 175], [70, 175], [70, 93]], sign: '-' },
    { pts: [[330, 80], [330, 240], [284, 240]], tap: true },
    { pts: [[216, 240], [140, 240], [140, 257]], sign: '-' },
    { pts: [[216, 300], [140, 300], [140, 283]], sign: '+' },
    { pts: [[127, 270], [105, 270], [105, 120], [140, 120], [140, 93]] },
  ],
  labels: [
    { sym: 'V_{cmd}', x: 18, y: 70, anchor: 'start' },
    { sym: 'i', tag: 'i', x: 322, y: 70, anchor: 'end' },
    { sym: 'T_{L}', tag: 'TL', x: 465, y: 26, anchor: 'start' },
    { sym: 'ω', tag: 'w', x: 665, y: 70 },
    { sym: 'physical', x: 180, y: 167 },
    { sym: 'active', x: 180, y: 232 },
  ],
};

export const stateFeedbackFigures: FigurePair = {
  physical: msfPhysical,
  block: msfBlock,
  physicalCaption: 'Rₐ is a real added resistance in the drive; R̂ₚ and K̂ₑ are numbers in the controller that subtract what the motor already does.',
  blockCaption: 'Kₑ feeds back the same ω that K̂ₑ feeds back, through the same sign. Setting K̂ₑ = Kₑ is what cancels the loop the motor built.',
};

/* ------------------------------------------------------------------ */
/* W1 -- mass, spring, damper                                          */
/* ------------------------------------------------------------------ */

/** The canonical second-order device, with whichever symbol set is in use. */
function msdSchematic(sym: { m: string; k: string; c: string }, active: boolean): Schematic {
  const width = active ? 620 : 520;
  const sch: Schematic = {
    title: 'Mass on a spring and a damper',
    viewBox: [0, 0, width, 292],
    wires: [
      { pts: [[60, 110], [85, 110]] }, { pts: [[215, 110], [245, 110]] },
      { pts: [[60, 190], [85, 190]] }, { pts: [[215, 190], [245, 190]] },
    ],
    parts: [
      { kind: 'spring', x: 150, y: 110, len: 130, label: sym.k, sym: 'k', value: true, side: -1 },
      { kind: 'damper', x: 150, y: 190, len: 130, label: sym.c, sym: 'c', value: true, side: 1 },
      { kind: 'mass', x: 300, y: 150, w: 110, h: 120, label: sym.m, sym: 'm', value: true },
    ],
    markers: [
      { kind: 'hatch', x: 60, y: 150, dir: 'v', len: 160, side: -1 },
      { kind: 'hatch', x: 300, y: 222, dir: 'h', len: 130, side: 1 },
      { kind: 'force', x: 300, y: 62, len: 70, flow: 1, label: active ? 'F_{cmd}' : 'F', sym: 'F', side: -1 },
      { kind: 'force', x: 300, y: 248, len: 60, flow: 1, label: 'x', sym: 'x', side: 1 },
    ],
    labels: [],
  };
  if (active) {
    sch.markers!.push({ kind: 'couple', x: 415, y: 150, len: 110, flow: -1, label: 'K_{a}x + C_{a}\\dot{x}', sym: 'Ka Ca', side: -1 });
    sch.boxes = [{ x: 478, y: 108, w: 126, h: 84, label: 'controller' }];
    sch.labels!.push({ x: 541, y: 160, text: 'measures x, \\dot{x}', small: true });
  }
  return sch;
}

const sorBlock: BlockFigure = {
  title: 'Force in, position out, with the spring and damper as feedback',
  viewBox: [0, 0, 520, 228],
  elements: [
    { kind: 'sum', x: 90, y: 90 },
    { kind: 'fn', x: 175, y: 90, w: 46, label: frac('1', 'm'), sym: 'm' },
    { kind: 'fn', x: 260, y: 90, w: 46, label: frac('1', 's') },
    { kind: 'fn', x: 345, y: 90, w: 46, label: frac('1', 's') },
    { kind: 'gain', x: 250, y: 185, w: 46, label: 'c', sym: 'c' },
    { kind: 'gain', x: 250, y: 30, w: 46, label: 'k', sym: 'k' },
  ],
  wires: [
    { pts: [[20, 90], [77, 90]], sign: '+' },
    { pts: [[103, 90], [150, 90]] },
    { pts: [[198, 90], [235, 90]] },
    { pts: [[283, 90], [320, 90]] },
    { pts: [[368, 90], [500, 90]] },
    { pts: [[300, 90], [300, 185], [275, 185]], tap: true },
    { pts: [[227, 185], [90, 185], [90, 103]], sign: '-' },
    { pts: [[430, 90], [430, 30], [275, 30]], tap: true },
    { pts: [[227, 30], [90, 30], [90, 77]], sign: '-' },
  ],
  labels: [
    { sym: 'F', tag: 'F', x: 24, y: 80, anchor: 'start' },
    { sym: '\\dot{x}', tag: 'v', x: 305, y: 80, anchor: 'start' },
    { sym: 'x', tag: 'x', x: 400, y: 80 },
    { sym: 'c\\dot{x}', x: 165, y: 177 },
    { sym: 'kx', x: 170, y: 22 },
  ],
};

export const secondOrderFigures: FigurePair = {
  physical: msdSchematic({ m: 'm', k: 'k', c: 'c' }, false),
  block: sorBlock,
  physicalCaption: 'The spring and the damper are already feedback: both act on the mass in proportion to its own state.',
  blockCaption: 'Two integrators between force and position, with k around both and c around one. That is the whole of a second-order system.',
};

export const activeFeedbackPhysical = msdSchematic({ m: 'M', k: 'K_{p}', c: 'C_{p}' }, true);

/* ------------------------------------------------------------------ */
/* W5L1 -- manipulated input decoupling                                */
/* ------------------------------------------------------------------ */

const idcPhysical: Schematic = {
  title: 'A rigid body pushed by two actuators mounted either side of its centre',
  viewBox: [0, 0, 560, 262],
  wires: [
    { pts: [[150, 222], [410, 222]], tone: 'muted' },
    { pts: [[150, 214], [150, 230]], tone: 'muted' },
    { pts: [[410, 214], [410, 230]], tone: 'muted' },
  ],
  parts: [
    { kind: 'mass', x: 280, y: 120, w: 330, h: 40 },
  ],
  markers: [
    { kind: 'force', x: 150, y: 172, dir: 'v', len: 56, flow: -1, label: 'F_{1}', sym: 'Kb1', side: -1 },
    { kind: 'force', x: 410, y: 172, dir: 'v', len: 56, flow: -1, label: 'F_{2}', sym: 'Kb2', side: 1 },
    { kind: 'force', x: 220, y: 66, dir: 'v', len: 56, flow: -1, label: 'F', sym: 'F', side: -1 },
    { kind: 'torque', x: 330, y: 120, len: 44, flow: -1, label: 'T', sym: 'T', side: -1 },
    { kind: 'node', x: 280, y: 120 },
  ],
  labels: [
    { x: 280, y: 244, text: 'L', sym: 'L' },
    { x: 280, y: 112, text: 'centre of mass', small: true },
    { x: 554, y: 256, text: 'the actuators are where they fit, not where the states are', anchor: 'end', small: true },
  ],
};

const idcBlock: BlockFigure = {
  title: 'Commands for the states, decoupled into commands for the actuators',
  viewBox: [0, 0, 700, 246],
  symbols: { L: { svg: 'L' }, Lhat: { svg: 'L̂' } },
  elements: [
    { kind: 'fn', x: 140, y: 110, w: 76, h: 150, label: 'B̂^{−1}', sym: 'Lhat' },
    { kind: 'fn', x: 315, y: 65, w: 116, h: 46, label: frac('K_{b1}', 's+K_{b1}'), sym: 'Kb1', value: true },
    { kind: 'fn', x: 315, y: 155, w: 116, h: 46, label: frac('K_{b2}', 's+K_{b2}'), sym: 'Kb2', value: true },
    { kind: 'fn', x: 490, y: 110, w: 76, h: 150, label: 'B', sym: 'L' },
  ],
  wires: [
    { pts: [[20, 65], [102, 65]] },
    { pts: [[20, 155], [102, 155]] },
    { pts: [[178, 65], [257, 65]] },
    { pts: [[178, 155], [257, 155]] },
    { pts: [[373, 65], [452, 65]] },
    { pts: [[373, 155], [452, 155]] },
    { pts: [[528, 65], [680, 65]] },
    { pts: [[528, 155], [680, 155]] },
  ],
  labels: [
    { sym: 'F^{*}', x: 24, y: 55, anchor: 'start' },
    { sym: 'T^{*}', x: 24, y: 145, anchor: 'start' },
    { sym: 'F_{1}^{*}', x: 216, y: 55 },
    { sym: 'F_{2}^{*}', x: 216, y: 145 },
    { sym: 'F_{1}', x: 412, y: 55 },
    { sym: 'F_{2}', x: 412, y: 145 },
    { sym: 'F', tag: 'F', x: 650, y: 55 },
    { sym: 'T', tag: 'T', x: 650, y: 145 },
    { sym: 'Lhat', value: true, x: 140, y: 214 },
    { sym: 'L', value: true, x: 490, y: 214 },
  ],
};

export const inputDecouplingFigures: FigurePair = {
  physical: idcPhysical,
  block: idcBlock,
  physicalCaption: 'Each actuator moves the body and turns it. Neither one is "the force input" or "the torque input".',
  blockCaption: 'B is the geometry. B̂⁻¹ is the controller undoing it, so that F* reaches only F and T* reaches only T — if the estimate and the two actuators agree.',
};

/**
 * The decoupling matrix and the geometry matrix as wiring, for the derivation
 * walkthrough: one summing junction per matrix row, one gain per entry.
 *
 * `shared` false draws B^-1 literally -- four entries, four blocks -- so each
 * block can be lit from its own cell of the matrix. `shared` true is the usual
 * drawing, where the two equal gains in a column are computed once and tapped.
 * Both are the same signal graph; the walkthrough swaps between them to show
 * that. The bar's own geometry, B, is drawn the same way to the right.
 *
 * Keys: m11..m22 are entries of B^-1 and b21, b22 the two arm entries of B.
 * `h` and `q` name the shared half and 1/L blocks, so hovering a shared block
 * lights both of the cells it stands for.
 */
export function decouplingWiring(shared: boolean): BlockFigure {
  const half = frac('1', '2'), overL = frac('1', 'L'), arm = frac('L', '2');
  const gain = { kind: 'gain', w: 60, h: 44 };

  const controller = shared
    ? {
        elements: [
          { ...gain, x: 150, y: 70, label: half, sym: 'h m11 m21', tone: 'active' },
          { ...gain, x: 150, y: 260, label: overL, sym: 'q m12 m22 L', tone: 'active' },
        ],
        wires: [
          { pts: [[20, 70], [120, 70]], tone: 'active' },
          { pts: [[20, 260], [120, 260]], tone: 'active' },
          { pts: [[180, 70], [287, 70]], sign: '+', tone: 'active' },
          { pts: [[225, 70], [225, 200], [300, 200], [300, 247]], tap: true, sign: '+', tone: 'active' },
          { pts: [[180, 260], [287, 260]], sign: '-', tone: 'active' },
          { pts: [[250, 260], [250, 130], [300, 130], [300, 83]], tap: true, sign: '+', tone: 'active' },
        ],
        labels: [
          { sym: 'w11', tag: 'h', value: true, x: 203, y: 44 },
          { sym: 'w12', tag: 'q', value: true, x: 215, y: 282 },
        ],
      }
    : {
        elements: [
          { ...gain, x: 150, y: 70, label: half, sym: 'm11', tone: 'active' },
          { ...gain, x: 150, y: 130, label: overL, sym: 'm12 L', tone: 'active' },
          { ...gain, x: 150, y: 200, label: half, sym: 'm21', tone: 'active' },
          { ...gain, x: 150, y: 260, label: overL, sym: 'm22 L', tone: 'active' },
        ],
        wires: [
          { pts: [[20, 70], [120, 70]], tone: 'active' },
          { pts: [[70, 70], [70, 200], [120, 200]], tap: true, tone: 'active' },
          { pts: [[20, 260], [120, 260]], tone: 'active' },
          { pts: [[95, 260], [95, 130], [120, 130]], tap: true, tone: 'active' },
          { pts: [[180, 70], [287, 70]], sign: '+', tone: 'active' },
          { pts: [[180, 130], [300, 130], [300, 83]], sign: '+', tone: 'active' },
          { pts: [[180, 200], [300, 200], [300, 247]], sign: '+', tone: 'active' },
          { pts: [[180, 260], [287, 260]], sign: '-', tone: 'active' },
        ],
        labels: [
          { sym: 'w11', tag: 'm11', value: true, x: 236, y: 44 },
          { sym: 'w12', tag: 'm12', value: true, x: 236, y: 104 },
          { sym: 'w21', tag: 'm21', value: true, x: 236, y: 174 },
          { sym: 'w22', tag: 'm22', value: true, x: 236, y: 282 },
        ],
      };

  return {
    title: shared
      ? 'The decoupling matrix with its equal gains shared, feeding the geometry of the bar'
      : 'The decoupling matrix drawn one block per entry, feeding the geometry of the bar',
    viewBox: [0, 0, 760, 330],
    symbols: {
      Fc: { svg: 'F^{*}' }, Tc: { svg: 'T^{*}' }, F1: { svg: 'F_{1}' }, F2: { svg: 'F_{2}' },
      w11: { svg: '½F^{*}' }, w21: { svg: '½F^{*}' }, w12: { svg: 'T^{*}/L' }, w22: { svg: 'T^{*}/L' },
      wb21: { svg: '(L/2)F_{1}' }, wb22: { svg: '(L/2)F_{2}' },
    },
    elements: [
      ...controller.elements,
      { kind: 'sum', x: 300, y: 70, tone: 'active' },
      { kind: 'sum', x: 300, y: 260, tone: 'active' },
      { ...gain, x: 505, y: 140, label: arm, sym: 'b21 L', tone: 'physical' },
      { ...gain, x: 505, y: 260, label: arm, sym: 'b22 L', tone: 'physical' },
      { kind: 'sum', x: 600, y: 70, tone: 'physical' },
      { kind: 'sum', x: 665, y: 260, tone: 'physical' },
    ],
    wires: [
      ...controller.wires,
      { pts: [[313, 70], [587, 70]], sign: '+', tone: 'physical' },
      { pts: [[420, 70], [420, 140], [475, 140]], tap: true, tone: 'physical' },
      { pts: [[535, 140], [665, 140], [665, 247]], sign: '+', tone: 'physical' },
      { pts: [[313, 260], [475, 260]], tone: 'physical' },
      { pts: [[440, 260], [440, 200], [600, 200], [600, 83]], tap: true, sign: '+', tone: 'physical' },
      { pts: [[535, 260], [652, 260]], sign: '-', tone: 'physical' },
      { pts: [[613, 70], [745, 70]], tone: 'physical' },
      { pts: [[678, 260], [745, 260]], tone: 'physical' },
    ],
    labels: [
      { sym: 'Fc', value: true, x: 22, y: 44, anchor: 'start' },
      { sym: 'Tc', value: true, x: 22, y: 282, anchor: 'start' },
      ...controller.labels,
      { sym: 'F1', value: true, x: 365, y: 44 },
      { sym: 'F2', value: true, x: 365, y: 282 },
      { sym: 'wb21', tag: 'b21', value: true, x: 712, y: 150 },
      { sym: 'wb22', tag: 'b22', value: true, x: 592, y: 282 },
      { sym: 'F', value: true, x: 705, y: 44 },
      { sym: 'T', value: true, x: 715, y: 282 },
      { sym: 'controller: B^{−1}', x: 160, y: 322 },
      { sym: 'the bar: B', x: 545, y: 322 },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* W5L2 -- disturbance input and nonlinear state feedback decoupling   */
/* ------------------------------------------------------------------ */

const didBlock: BlockFigure = {
  title: 'Vehicle speed with drag as nonlinear state feedback, and the controller around it',
  viewBox: [0, 0, 700, 300],
  elements: [
    { kind: 'sum', x: 110, y: 90 },
    { kind: 'gain', x: 190, y: 90, w: 50, label: 'C_{a}', sym: 'Ca', value: true },
    { kind: 'sum', x: 280, y: 90 },
    { kind: 'sum', x: 380, y: 90 },
    { kind: 'fn', x: 460, y: 90, w: 46, label: frac('1', 'm') },
    { kind: 'fn', x: 540, y: 90, w: 46, label: frac('1', 's') },
    { kind: 'fn', x: 470, y: 170, w: 130, h: 40, label: '½k(v+v_{w})^{2}', sym: 'vw' },
    { kind: 'fn', x: 280, y: 205, w: 110, h: 40, label: 'decoupling', sym: 'khat', value: true },
  ],
  wires: [
    { pts: [[20, 90], [97, 90]], sign: '+' },
    { pts: [[123, 90], [165, 90]] },
    { pts: [[215, 90], [267, 90]], sign: '+' },
    { pts: [[293, 90], [367, 90]], sign: '+' },
    { pts: [[393, 90], [437, 90]] },
    { pts: [[483, 90], [517, 90]] },
    { pts: [[563, 90], [685, 90]] },
    { pts: [[380, 20], [380, 77]], sign: '-' },
    { pts: [[610, 90], [610, 170], [535, 170]], tap: true },
    { pts: [[405, 170], [380, 170], [380, 103]], sign: '-' },
    { pts: [[650, 90], [650, 280], [110, 280], [110, 103]], tap: true, sign: '-' },
    { pts: [[650, 215], [335, 215]], tap: true },
    { pts: [[280, 185], [280, 103]], sign: '+' },
  ],
  labels: [
    { sym: 'v^{*}', tag: 'vs', x: 24, y: 80, anchor: 'start' },
    { sym: 'f_{m}', x: 330, y: 80 },
    { sym: 'W sinθ', tag: 'th', x: 390, y: 30, anchor: 'start' },
    { sym: 'v', x: 672, y: 80 },
    { sym: 'physical', x: 470, y: 140 },
    { sym: 'needs v, v_{w}, θ', x: 500, y: 240 },
  ],
};

export const disturbanceDecouplingFigures: FigurePair = {
  block: didBlock,
  blockCaption: 'Drag is state feedback the air supplies, and it is nonlinear, so its gain depends on how fast you are going. The decoupling block adds back whichever of those terms the controller can compute.',
};

/* ------------------------------------------------------------------ */
/* W6 -- the regulated R-L circuit, drawn once for two tools           */
/* ------------------------------------------------------------------ */

/** Series R-L driven by a commanded voltage, optionally against a load voltage. */
function rlSchematic(opts: { load: boolean; title: string; law: { text: string; sym: string }[]; note: string }): Schematic {
  const wires: Schematic['wires'] = [
    { pts: [[60, 60], [60, 101]] }, { pts: [[60, 149], [60, 190]] },
    { pts: [[60, 60], [166, 60]] }, { pts: [[214, 60], [306, 60]] },
    { pts: [[354, 60], [480, 60]] },
    { pts: [[60, 190], [480, 190]] },
  ];
  const parts: Schematic['parts'] = [
    { kind: 'vsrc', x: 60, y: 125, dir: 'v', flow: -1, label: 'e_{i}', side: -1 },
    { kind: 'R', x: 190, y: 60, label: 'R_{p}', sym: 'Rp', value: true, side: -1 },
    { kind: 'L', x: 330, y: 60, label: 'L_{p}', sym: 'Lp', value: true, side: -1 },
  ];
  if (opts.load) {
    wires.push({ pts: [[480, 60], [480, 101]] }, { pts: [[480, 149], [480, 190]] });
    parts.push({ kind: 'vsrc', x: 480, y: 125, dir: 'v', flow: -1, label: 'e_{o}', sym: 'eo', side: 1 });
  } else {
    wires.push({ pts: [[480, 60], [480, 190]] });
  }
  return {
    title: opts.title,
    viewBox: [0, 0, 560, 300],
    boxes: [{ x: 40, y: 226, w: 360, h: 58, label: 'controller' }],
    wires,
    parts,
    markers: [
      { kind: 'current', x: 420, y: 60, len: 34, flow: 1, label: 'i', sym: 'i', side: -1 },
      { kind: 'ground', x: 270, y: 190 },
      { kind: 'couple', x: 60, y: 208, dir: 'v', len: 34, flow: -1 },
    ],
    labels: [
      { x: 56, y: 252, text: 'e_{i} =', anchor: 'start' },
      ...opts.law.map((l, n) => ({ x: 110 + n * 130, y: 252, text: l.text, sym: l.sym, anchor: 'start' })),
      { x: 554, y: 294, text: opts.note, anchor: 'end', small: true },
    ],
  };
}

const vzrBlock: BlockFigure = {
  title: 'Current loop with the physical resistance drawn as its own feedback path',
  viewBox: [0, 0, 700, 310],
  symbols: { Rhat: { svg: 'R̂_{p}' } },
  elements: [
    { kind: 'sum', x: 80, y: 90 },
    { kind: 'gain', x: 160, y: 90, w: 50, label: 'R_{a}', sym: 'Ra', value: true },
    { kind: 'sum', x: 250, y: 90 },
    { kind: 'sum', x: 340, y: 90 },
    { kind: 'fn', x: 430, y: 90, w: 54, label: frac('1', 'L_{p}'), sym: 'Lp' },
    { kind: 'fn', x: 520, y: 90, w: 46, label: frac('1', 's') },
    { kind: 'gain', x: 460, y: 170, w: 50, label: 'R_{p}', sym: 'Rp', value: true },
    { kind: 'gain', x: 400, y: 245, w: 50, label: 'R̂_{p}', sym: 'Rhat', value: true },
  ],
  wires: [
    { pts: [[15, 90], [67, 90]], sign: '+' },
    { pts: [[93, 90], [135, 90]] },
    { pts: [[185, 90], [237, 90]], sign: '+' },
    { pts: [[263, 90], [327, 90]], sign: '+' },
    { pts: [[353, 90], [403, 90]] },
    { pts: [[457, 90], [497, 90]] },
    { pts: [[543, 90], [685, 90]] },
    { pts: [[340, 20], [340, 77]], sign: '-' },
    { pts: [[590, 90], [590, 170], [485, 170]], tap: true },
    { pts: [[435, 170], [340, 170], [340, 103]], sign: '-' },
    { pts: [[620, 90], [620, 245], [425, 245]], tap: true },
    { pts: [[375, 245], [250, 245], [250, 103]], sign: '+' },
    { pts: [[650, 90], [650, 296], [80, 296], [80, 103]], tap: true, sign: '-' },
  ],
  labels: [
    { sym: 'i^{*}', x: 18, y: 80, anchor: 'start' },
    { sym: 'e_{i}', x: 296, y: 80 },
    { sym: 'e_{o}', tag: 'eo', x: 350, y: 30, anchor: 'start' },
    { sym: 'i', tag: 'i', x: 672, y: 80 },
    { sym: 'a loop whose command is 0', x: 470, y: 140 },
  ],
};

export const virtualZeroFigures: FigurePair = {
  physical: rlSchematic({
    load: true,
    title: 'Series R-L supply regulating its current into an unknown load voltage',
    law: [{ text: 'R_{a}(i^{*} − i)', sym: 'Ra' }, { text: '+ R̂_{p} i', sym: 'Rhat' }],
    note: 'the second term is the decoupling; without it the controller is a proportional gain',
  }),
  block: vzrBlock,
  physicalCaption: 'Rₚ is a part you bought. Rₐ and R̂ₚ are numbers in the controller that sets the source voltage.',
  blockCaption: 'Rₚ feeds the current back exactly as Rₐ does — but nothing is subtracted from it first, so the reference it regulates toward is zero.',
};

/* ------------------------------------------------------------------ */
/* W6L2 -- PI current regulation at locked rotor                       */
/* ------------------------------------------------------------------ */

const picBlock: BlockFigure = {
  title: 'PI controller and winding, each written with its own time constant',
  viewBox: [0, 0, 640, 222],
  symbols: {
    Kp: { svg: 'K_{p}' }, Ki: { svg: 'K_{i}' }, tc: { svg: 'τ_{c}' }, te: { svg: 'τ_{e}' },
  },
  elements: [
    { kind: 'sum', x: 90, y: 70 },
    { kind: 'fn', x: 225, y: 70, w: 140, h: 48, label: frac('K_{i}(τ_{c}s+1)', 's'), sym: 'fd rho' },
    { kind: 'fn', x: 435, y: 70, w: 120, h: 48, label: frac('1/R_{p}', 'τ_{e}s+1'), sym: 'Rp Lp' },
  ],
  wires: [
    { pts: [[20, 70], [77, 70]], sign: '+' },
    { pts: [[103, 70], [155, 70]] },
    { pts: [[295, 70], [375, 70]] },
    { pts: [[495, 70], [625, 70]] },
    { pts: [[560, 70], [560, 200], [90, 200], [90, 83]], tap: true, sign: '-' },
  ],
  labels: [
    { sym: 'i^{*}', x: 24, y: 60, anchor: 'start' },
    { sym: 'e_{i}', x: 335, y: 60 },
    { sym: 'i', tag: 'i', x: 605, y: 60 },
    { sym: 'Kp', value: true, x: 165, y: 132 },
    { sym: 'Ki', value: true, x: 235, y: 132 },
    { sym: 'tc', value: true, x: 305, y: 132 },
    { sym: 'te', value: true, x: 435, y: 132 },
  ],
};

export const piRegulatorFigures: FigurePair = {
  physical: rlSchematic({
    load: false,
    title: 'Motor winding with the rotor locked: resistance and inductance, no back-EMF',
    law: [{ text: 'K_{p}(i^{*} − i)', sym: 'fd' }, { text: '+ K_{i}∫(i^{*} − i)dt', sym: 'fd rho' }],
    note: 'a locked rotor makes no back-EMF, so the winding is all the controller sees',
  }),
  block: picBlock,
  physicalCaption: 'With the shaft held, speed is zero and the mechanical half of the motor drops out of the current loop.',
  blockCaption: 'The controller has a zero at −1/τc and the winding has a pole at −1/τe. Whether they sit on top of each other is the whole tuning question.',
};

/* ------------------------------------------------------------------ */
/* W7L1 -- state feedback motion control on a motor shaft              */
/* ------------------------------------------------------------------ */

/**
 * A shaft behind an ideal torque modulator, with the three state feedback
 * gains in the controller. The command tool adds the command inputs; the
 * tuning tool holds them at zero, because dynamic stiffness is measured
 * with nothing commanded.
 */
function motionSchematic(command: boolean): Schematic {
  return {
    title: command
      ? 'Motor shaft behind a torque modulator, following a position and velocity command'
      : 'Motor shaft behind a torque modulator, holding position against a load torque',
    viewBox: [0, 0, 640, 290],
    boxes: [{ x: 18, y: 46, w: 238, h: 190, label: 'controller' }],
    wires: [
      { pts: [[372, 140], [604, 140]] },
      { pts: [[530, 140], [530, 152]] },
    ],
    parts: [
      { kind: 'disc', x: 440, y: 140, w: 30, label: 'J_{p}', sym: 'J', value: true },
      { kind: 'damper', x: 530, y: 180, dir: 'v', len: 56, label: 'b_{p}', sym: 'bp', value: true, side: 1 },
    ],
    markers: [
      { kind: 'couple', x: 312, y: 140, dir: 'h', len: 104, flow: 1, label: 'T_{em} = T^{*}_{em}' },
      { kind: 'torque', x: 440, y: 140, len: 42, flow: 1, label: 'ω, θ', side: -1 },
      { kind: 'torque', x: 590, y: 140, len: 22, flow: -1, label: 'T_{L}', sym: 'TL', side: -1 },
      { kind: 'hatch', x: 530, y: 208, dir: 'h', len: 56, side: 1 },
    ],
    labels: [
      { x: 30, y: 92, text: 'b_{a}(ω^{*} − ω)', sym: 'fv', anchor: 'start' },
      { x: 30, y: 134, text: '+ K_{sa}(θ^{*} − θ)', sym: 'fp', anchor: 'start' },
      { x: 30, y: 176, text: '+ K_{isa}∫(θ^{*} − θ)dt', sym: 'fip', anchor: 'start' },
      { x: 137, y: 222, text: 'measures θ and ω', small: true },
      command
        ? { x: 137, y: 30, text: 'θ^{*} = A sin 2πf_{c}t,  ω^{*} = dθ^{*}/dt', sym: 'fc' }
        : { x: 137, y: 30, text: 'commands held at zero', small: true },
      { x: 634, y: 280, text: command ? 'θ follows θ^{*}' : 'T_{L} is the disturbance, θ the response', anchor: 'end', small: true },
    ],
  };
}

const motionTuneBlock: BlockFigure = {
  title: 'Torque modulator, shaft, and the three state feedback gains',
  viewBox: [0, 0, 690, 356],
  elements: [
    { kind: 'sum', x: 40, y: 70, tone: 'active' },
    { kind: 'sum', x: 95, y: 70, tone: 'active' },
    { kind: 'sum', x: 150, y: 70, tone: 'active' },
    { kind: 'gain', x: 205, y: 70, w: 40, label: '≈1' },
    { kind: 'sum', x: 265, y: 70 },
    { kind: 'fn', x: 335, y: 70, w: 46, label: frac('1', 'J_{p}'), sym: 'J' },
    { kind: 'fn', x: 410, y: 70, w: 46, label: frac('1', 's') },
    { kind: 'fn', x: 500, y: 70, w: 46, label: frac('1', 's') },
    { kind: 'fn', x: 590, y: 70, w: 46, label: frac('1', 's'), tone: 'active' },
    { kind: 'gain', x: 335, y: 132, w: 54, label: 'b_{p}', sym: 'bp', value: true },
    { kind: 'gain', x: 335, y: 194, w: 60, label: 'b_{a}', sym: 'fv', value: true, tone: 'active' },
    { kind: 'gain', x: 335, y: 256, w: 60, label: 'K_{sa}', sym: 'fp', value: true, tone: 'active' },
    { kind: 'gain', x: 335, y: 318, w: 64, label: 'K_{isa}', sym: 'fip', value: true, tone: 'active' },
  ],
  wires: [
    { pts: [[8, 70], [27, 70]] },
    { pts: [[53, 70], [82, 70]] },
    { pts: [[108, 70], [137, 70]] },
    { pts: [[163, 70], [185, 70]] },
    { pts: [[225, 70], [252, 70]], sign: '+' },
    { pts: [[265, 18], [265, 57]], sign: '-' },
    { pts: [[278, 70], [312, 70]] },
    { pts: [[358, 70], [387, 70]] },
    { pts: [[433, 70], [477, 70]] },
    { pts: [[523, 70], [567, 70]] },
    { pts: [[613, 70], [682, 70]] },
    { pts: [[445, 70], [445, 132], [362, 132]], tap: true },
    { pts: [[308, 132], [265, 132], [265, 83]], sign: '-' },
    { pts: [[460, 70], [460, 194], [365, 194]], tap: true, tone: 'active' },
    { pts: [[305, 194], [150, 194], [150, 83]], sign: '-', tone: 'active' },
    { pts: [[545, 70], [545, 256], [365, 256]], tap: true, tone: 'active' },
    { pts: [[305, 256], [95, 256], [95, 83]], sign: '-', tone: 'active' },
    { pts: [[640, 70], [640, 318], [367, 318]], tap: true, tone: 'active' },
    { pts: [[303, 318], [40, 318], [40, 83]], sign: '-', tone: 'active' },
  ],
  labels: [
    { sym: '0', x: 12, y: 60, anchor: 'start' },
    { sym: 'T_{em}', x: 238, y: 60 },
    { sym: 'T_{L}', tag: 'TL', x: 275, y: 24, anchor: 'start' },
    { sym: 'ω', x: 452, y: 60 },
    { sym: 'θ', x: 541, y: 60 },
    { sym: '∫θdt', x: 662, y: 60 },
  ],
};

export const motionTuneFigures: FigurePair = {
  physical: motionSchematic(false),
  block: motionTuneBlock,
  physicalCaption: 'Inside the torque loop’s bandwidth the modulator is a wire, and what is left is an inertia, a bearing drag, and whatever the controller adds.',
  blockCaption: 'Each gain wraps one more integrator than the last: b_a around one, K_sa around two, K_isa around three. Each takes over the stiffness one decade further down.',
};

/* ------------------------------------------------------------------ */
/* W7L1 + W7L2 -- motion commands: state feedback and classical        */
/* ------------------------------------------------------------------ */

const sfbCommandBlock: BlockFigure = {
  title: 'State feedback motion controller with position and velocity commands',
  viewBox: [0, 0, 700, 236],
  elements: [
    { kind: 'sum', x: 90, y: 46, tone: 'active' },
    { kind: 'gain', x: 190, y: 46, w: 60, label: 'K_{sa}', sym: 'fp', value: true, tone: 'active' },
    { kind: 'fn', x: 160, y: 110, w: 40, label: frac('1', 's'), tone: 'active' },
    { kind: 'gain', x: 235, y: 110, w: 60, label: 'K_{isa}', sym: 'fip', value: true, tone: 'active' },
    { kind: 'sum', x: 110, y: 165, tone: 'active' },
    { kind: 'gain', x: 190, y: 165, w: 60, label: 'b_{a}', sym: 'fv', value: true, tone: 'active' },
    { kind: 'sum', x: 300, y: 110, tone: 'active' },
    { kind: 'gain', x: 360, y: 110, w: 40, label: '≈1' },
    { kind: 'sum', x: 430, y: 110 },
    { kind: 'fn', x: 500, y: 110, w: 46, label: frac('1', 'J_{p}') },
    { kind: 'fn', x: 570, y: 110, w: 40, label: frac('1', 's') },
    { kind: 'fn', x: 645, y: 110, w: 40, label: frac('1', 's') },
    { kind: 'gain', x: 500, y: 172, w: 50, label: 'b_{p}' },
  ],
  wires: [
    { pts: [[10, 46], [77, 46]], sign: '+' },
    { pts: [[103, 46], [160, 46]] },
    { pts: [[120, 46], [120, 110], [140, 110]], tap: true },
    { pts: [[180, 110], [205, 110]] },
    { pts: [[220, 46], [300, 46], [300, 97]], sign: '+' },
    { pts: [[265, 110], [287, 110]], sign: '+' },
    { pts: [[10, 165], [97, 165]], sign: '+' },
    { pts: [[123, 165], [160, 165]] },
    { pts: [[220, 165], [300, 165], [300, 123]], sign: '+' },
    { pts: [[313, 110], [340, 110]] },
    { pts: [[380, 110], [417, 110]], sign: '+' },
    { pts: [[430, 30], [430, 97]], sign: '-' },
    { pts: [[443, 110], [477, 110]] },
    { pts: [[523, 110], [550, 110]] },
    { pts: [[590, 110], [625, 110]] },
    { pts: [[665, 110], [695, 110]] },
    { pts: [[600, 110], [600, 172], [525, 172]], tap: true },
    { pts: [[475, 172], [430, 172], [430, 123]], sign: '-' },
    { pts: [[612, 110], [612, 222], [110, 222], [110, 178]], tap: true, sign: '-', tone: 'active' },
    { pts: [[680, 110], [680, 10], [90, 10], [90, 33]], tap: true, sign: '-', tone: 'active' },
  ],
  labels: [
    { sym: 'θ^{*}', tag: 'fc', x: 14, y: 36, anchor: 'start' },
    { sym: 'ω^{*}', tag: 'wstar', x: 14, y: 155, anchor: 'start' },
    { sym: 'T^{*}_{em}', x: 327, y: 100 },
    { sym: 'T_{L}', x: 440, y: 36, anchor: 'start' },
    { sym: 'ω', x: 607, y: 100 },
    { sym: 'θ', x: 690, y: 100 },
  ],
};

const classicalCommandBlock: BlockFigure = {
  title: 'Classical cascade: P position loop around a PI velocity loop',
  viewBox: [0, 0, 700, 236],
  elements: [
    { kind: 'sum', x: 70, y: 110, tone: 'active' },
    { kind: 'gain', x: 130, y: 110, w: 54, label: 'K_{pp}', sym: 'kpp fp', value: true, tone: 'active' },
    { kind: 'sum', x: 190, y: 110, tone: 'active' },
    { kind: 'fn', x: 110, y: 172, w: 40, label: 's', sym: 'ff' },
    { kind: 'sum', x: 245, y: 110, tone: 'active' },
    { kind: 'fn', x: 325, y: 110, w: 96, h: 46, label: frac('K_{pv}s + K_{iv}', 's'), sym: 'kpi fv fip', value: true, tone: 'active' },
    { kind: 'gain', x: 405, y: 110, w: 40, label: '≈1' },
    { kind: 'sum', x: 460, y: 110 },
    { kind: 'fn', x: 520, y: 110, w: 46, label: frac('1', 'J_{p}') },
    { kind: 'fn', x: 580, y: 110, w: 40, label: frac('1', 's') },
    { kind: 'fn', x: 650, y: 110, w: 40, label: frac('1', 's') },
    { kind: 'gain', x: 520, y: 172, w: 50, label: 'b_{p}' },
  ],
  wires: [
    { pts: [[10, 110], [57, 110]], sign: '+' },
    { pts: [[83, 110], [103, 110]] },
    { pts: [[157, 110], [177, 110]], sign: '+' },
    { pts: [[30, 110], [30, 172], [90, 172]], tap: true },
    { pts: [[130, 172], [190, 172], [190, 123]], sign: '+' },
    { pts: [[203, 110], [232, 110]], sign: '+' },
    { pts: [[258, 110], [277, 110]] },
    { pts: [[373, 110], [385, 110]] },
    { pts: [[425, 110], [447, 110]], sign: '+' },
    { pts: [[460, 30], [460, 97]], sign: '-' },
    { pts: [[473, 110], [497, 110]] },
    { pts: [[543, 110], [560, 110]] },
    { pts: [[600, 110], [630, 110]] },
    { pts: [[670, 110], [695, 110]] },
    { pts: [[608, 110], [608, 172], [545, 172]], tap: true },
    { pts: [[495, 172], [460, 172], [460, 123]], sign: '-' },
    { pts: [[620, 110], [620, 222], [245, 222], [245, 123]], tap: true, sign: '-', tone: 'active' },
    { pts: [[684, 110], [684, 12], [70, 12], [70, 97]], tap: true, sign: '-', tone: 'active' },
  ],
  labels: [
    { sym: 'θ^{*}', tag: 'fc', x: 14, y: 100, anchor: 'start' },
    { sym: 'ω^{*}_{FF}', tag: 'ff', x: 150, y: 200 },
    { sym: 'ω^{*}', x: 218, y: 100 },
    { sym: 'T_{L}', x: 470, y: 36, anchor: 'start' },
    { sym: 'ω', x: 627, y: 100 },
    { sym: 'θ', x: 692, y: 100 },
  ],
};

export const sfbCommandFigures: FigurePair = {
  physical: motionSchematic(true),
  block: sfbCommandBlock,
  physicalCaption: 'The same shaft and the same three gains, now with commands: the references stop being zero.',
  blockCaption: 'Each gain compares a state with its own command. Leave ω* off and b_a sees −ω alone: the feedback is unchanged, the command is not.',
};

export const classicalCommandFigures: FigurePair = {
  physical: motionSchematic(true),
  block: classicalCommandBlock,
  physicalCaption: 'The same shaft. Only the controller’s wiring is different.',
  blockCaption: 'The position loop’s output is the velocity loop’s command. The s block is the velocity feedforward; without it the PI integrates ω* from the position error only.',
};

/* ------------------------------------------------------------------ */
/* W7L2 -- resonant load: two inertias on a compliant shaft            */
/* ------------------------------------------------------------------ */

const resonantPhysical: Schematic = {
  title: 'Motor and load inertias joined by a compliant shaft',
  viewBox: [0, 0, 660, 300],
  boxes: [{ x: 120, y: 18, w: 260, h: 84, label: 'controller' }],
  wires: [
    { pts: [[280, 200], [330, 200]] }, { pts: [[450, 200], [500, 200]] },
    { pts: [[560, 200], [624, 200]] },
    { pts: [[310, 200], [310, 252], [330, 252]] }, { pts: [[450, 252], [470, 252], [470, 200]] },
  ],
  parts: [
    { kind: 'disc', x: 250, y: 200, w: 30, label: 'J_{m}', sym: 'Jm', value: true },
    { kind: 'spring', x: 390, y: 200, len: 120, label: 'K_{r}', sym: 'Kr', value: true, side: -1 },
    { kind: 'damper', x: 390, y: 252, len: 120, label: 'b_{r}', sym: 'br', value: true, side: 1 },
    { kind: 'disc', x: 530, y: 200, w: 30, label: 'J_{L}', sym: 'JL', value: true },
  ],
  markers: [
    { kind: 'couple', x: 250, y: 132, dir: 'v', len: 40, flow: 1, label: 'T_{m}', side: -1 },
    { kind: 'torque', x: 610, y: 200, len: 22, flow: -1, label: 'T_{L}', sym: 'TL', side: -1 },
  ],
  labels: [
    { x: 250, y: 62, text: 'T_{m} = −K̂_{r}θ_{L}', sym: 'Khat' },
    { x: 250, y: 88, text: 'measures θ_{L}', small: true },
    { x: 212, y: 170, text: 'θ_{m}', anchor: 'end' },
    { x: 530, y: 160, text: 'θ_{L}' },
    { x: 654, y: 292, text: 'a gearbox reflected to the motor side looks the same', anchor: 'end', small: true },
  ],
};

const resonantBlock: BlockFigure = {
  title: 'Two inertias coupled by the shaft torque, with the load decoupled into the motor',
  viewBox: [0, 0, 640, 318],
  elements: [
    { kind: 'sum', x: 90, y: 60 },
    { kind: 'fn', x: 210, y: 60, w: 64, h: 44, label: frac('1', 'J_{m}s^{2}'), sym: 'Jm' },
    { kind: 'sum', x: 90, y: 200 },
    { kind: 'fn', x: 210, y: 200, w: 64, h: 44, label: frac('1', 'J_{L}s^{2}'), sym: 'JL' },
    { kind: 'sum', x: 470, y: 130 },
    { kind: 'gain', x: 330, y: 130, w: 92, label: 'K_{r} + b_{r}s', sym: 'Kr br' },
    { kind: 'gain', x: 330, y: 270, w: 54, label: 'K̂_{r}', sym: 'Khat', value: true, tone: 'active' },
  ],
  wires: [
    { pts: [[103, 60], [178, 60]] },
    { pts: [[242, 60], [620, 60]] },
    { pts: [[103, 200], [178, 200]] },
    { pts: [[242, 200], [620, 200]] },
    { pts: [[470, 60], [470, 117]], tap: true, sign: '-' },
    { pts: [[470, 200], [470, 143]], tap: true, sign: '+' },
    { pts: [[457, 130], [376, 130]] },
    { pts: [[284, 130], [90, 130], [90, 73]], sign: '+' },
    { pts: [[90, 130], [90, 187]], tap: true, sign: '-' },
    { pts: [[90, 248], [90, 213]], sign: '-' },
    { pts: [[560, 200], [560, 270], [357, 270]], tap: true, tone: 'active' },
    { pts: [[303, 270], [30, 270], [30, 60], [77, 60]], sign: '-', tone: 'active' },
  ],
  labels: [
    { sym: 'θ_{m}', x: 610, y: 50 },
    { sym: 'θ_{L}', x: 610, y: 190 },
    { sym: 'θ_{L} − θ_{m}', x: 418, y: 122 },
    { sym: 'T_{shaft}', x: 200, y: 122 },
    { sym: 'T_{L}', tag: 'TL', x: 100, y: 246, anchor: 'start' },
  ],
};

export const resonantLoadFigures: FigurePair = {
  physical: resonantPhysical,
  block: resonantBlock,
  physicalCaption: 'The shaft is a spring. Stiff for precision, lightly damped because damping costs power.',
  blockCaption: 'One shaft torque pushes both inertias, in opposite directions. K̂_r feeds the load’s position into the motor to cancel what the shaft does to it.',
};
