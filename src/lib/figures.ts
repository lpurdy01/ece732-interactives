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
