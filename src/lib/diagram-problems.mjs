/**
 * Practice block diagrams for the decomposition interactive.
 *
 * Every system here is original to this site and written from general
 * physics: a heated block, a series RLC circuit, a two-inertia shaft, a
 * pendulum, and a tank drained through a valve. None is taken from course
 * handouts or homework.
 *
 * Schema (all coordinates are SVG user units; x, y are element CENTRES):
 *
 *   inputs    { name: { role: 'manipulated' | 'disturbance', desc } }
 *   elements  sum  { id, kind:'sum',  x, y, r?, out }
 *             gain { id, kind:'gain', x, y, w?, h?, gain, label, name, out }
 *             fn   { id, kind:'fn',   x, y, w?, h?, fn,   label, name, out }
 *   wires     { src, dst?, sign?, tap?, pts: [[x,y], ...] }
 *             src is an element id or an input name; dst omitted = output arrow.
 *             Junction term order follows wire order.
 *   labels    { sym, x, y, anchor? }        a signal name drawn on the diagram
 *   regions   { n, title, members, out, box: [x,y,w,h], show, hint, read }
 *             `show` is the display form of the region equation. It is NOT the
 *             answer key: answers are derived from the graph, and
 *             verify/verify-diagram-problems.mjs asserts show == derivation.
 *   targets   whole-system questions once the regions are done:
 *             { kind:'state', state, display? }    row of x' = f(x, u); display is a
 *                                                  tidier arrangement, verified equal
 *             { kind:'tf', out, in, answer }        transfer function
 *             { kind:'slope', element, wrt, answer }   partial derivative at op
 *             { kind:'equilibrium', state, input, answer }  input that holds op
 *   symbols   { name: { tex, svg } }   svg uses _{sub} and ^{sup} markup
 */

const frac = (num, den) => ({ frac: [num, den] });

export const problems = [
  /* ---------------------------------------------------------------------- */
  {
    id: 'heated-block',
    title: 'Heated block',
    level: 'Warm-up · 1 state',
    blurb: 'A metal block with a heater, losing heat to the room through a thermal resistance. ' +
           'Heater power is what you command; room temperature is a disturbance you do not control.',
    viewBox: [0, 0, 600, 265],
    inputs: {
      q_in: { role: 'manipulated', desc: 'heater power [W]' },
      T_a: { role: 'disturbance', desc: 'ambient temperature [K]' },
    },
    params: { C: 'thermal capacitance [J/K]', R: 'thermal resistance [K/W]' },
    elements: [
      { id: 'sum1', kind: 'sum', x: 110, y: 100, out: 'CdT' },
      { id: 'gC', kind: 'gain', x: 215, y: 100, gain: '1/C', label: frac('1', 'C'), name: '1/C', out: 'dT' },
      { id: 'int1', kind: 'gain', x: 320, y: 100, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'T' },
      { id: 'sum2', kind: 'sum', x: 390, y: 195, out: 'Tdiff' },
      { id: 'gR', kind: 'gain', x: 255, y: 195, gain: '1/R', label: frac('1', 'R'), name: '1/R', out: 'q_loss' },
    ],
    wires: [
      { src: 'q_in', dst: 'sum1', sign: '+', pts: [[20, 100], [97, 100]] },
      { src: 'sum1', dst: 'gC', pts: [[123, 100], [192, 100]] },
      { src: 'gC', dst: 'int1', pts: [[238, 100], [297, 100]] },
      { src: 'int1', pts: [[343, 100], [580, 100]] },
      { src: 'int1', dst: 'sum2', sign: '+', tap: true, pts: [[480, 100], [480, 195], [403, 195]] },
      { src: 'T_a', dst: 'sum2', sign: '-', pts: [[390, 255], [390, 208]] },
      { src: 'sum2', dst: 'gR', pts: [[377, 195], [278, 195]] },
      { src: 'gR', dst: 'sum1', sign: '-', pts: [[232, 195], [110, 195], [110, 113]] },
    ],
    labels: [
      { sym: 'q_in', x: 24, y: 90, anchor: 'start' },
      { sym: 'CdT', x: 158, y: 90 },
      { sym: 'dT', x: 268, y: 90 },
      { sym: 'T', x: 540, y: 90 },
      { sym: 'T_a', x: 400, y: 252, anchor: 'start' },
      { sym: 'Tdiff', x: 330, y: 185 },
      { sym: 'q_loss', x: 175, y: 185 },
    ],
    regions: [
      {
        n: 1, title: 'Heat balance', members: ['sum1'], out: 'CdT', box: [84, 74, 52, 52],
        show: 'q_in - q_loss',
        hint: 'A junction output is the signed sum of what arrives. Read the sign printed beside each arrowhead.',
        read: 'Heat in minus heat out is what warms the block. The junction is the energy balance written as a picture: its output is C·dT/dt, in watts, the same units as the heater.',
      },
      {
        n: 2, title: 'Thermal mass', members: ['gC', 'int1'], out: 'T', box: [180, 68, 175, 64],
        show: 'CdT/(C*s)',
        hint: 'Two blocks in series multiply. 1/s is an integrator.',
        read: 'Divide the net heat flow by the capacitance to get the rate of temperature change, then integrate. The integrator output is the state.',
      },
      {
        n: 3, title: 'Temperature difference', members: ['sum2'], out: 'Tdiff', box: [364, 169, 52, 52],
        show: 'T - T_a',
        hint: 'Which input carries the minus sign?',
        read: 'Heat only leaks if the block is warmer than the room, so the loss is driven by the difference. The ambient temperature enters on the minus input: a warmer room means less loss.',
      },
      {
        n: 4, title: 'Thermal resistance', members: ['gR'], out: 'q_loss', box: [220, 163, 70, 64],
        show: 'Tdiff/R',
        hint: 'One block: output = gain × input.',
        read: 'A temperature difference across a thermal resistance drives a heat flow, the thermal twin of Ohm\'s law. Its output feeds back to the heat balance on a minus input: this is the block\'s physical state feedback.',
      },
    ],
    targets: [
      { kind: 'state', state: 'T', display: '(q_in - (T - T_a)/R)/C', lhs: '\\dot{T}', prompt: 'State equation: eliminate every internal signal.',
        vars: ['T', 'q_in', 'T_a', 'R', 'C'] },
      { kind: 'tf', out: 'T', in: 'q_in', lhs: '\\dfrac{T(s)}{Q_{in}(s)}', prompt: 'Response to the manipulated input (set T_a = 0).',
        answer: 'R/(R*C*s + 1)', vars: ['R', 'C', 's'] },
      { kind: 'tf', out: 'T', in: 'T_a', lhs: '\\dfrac{T(s)}{T_a(s)}', prompt: 'Response to the disturbance (set q_in = 0).',
        answer: '1/(R*C*s + 1)', vars: ['R', 'C', 's'] },
    ],
    symbols: {
      q_in: { tex: 'q_{in}', svg: 'q_{in}' },
      q_loss: { tex: 'q_{loss}', svg: 'q_{loss}' },
      CdT: { tex: 'C\\dot{T}', svg: 'C\\dot{T}' },
      dT: { tex: '\\dot{T}', svg: '\\dot{T}' },
      T: { tex: 'T', svg: 'T' },
      T_a: { tex: 'T_a', svg: 'T_{a}' },
      Tdiff: { tex: 'T_{diff}', svg: 'T − T_{a}' },
    },
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'series-rlc',
    title: 'Series RLC circuit',
    level: 'Two states · two loops',
    blurb: 'A voltage source driving a resistor, inductor and capacitor in series. ' +
           'Inductor current and capacitor voltage are the energy-storage states.',
    viewBox: [0, 0, 650, 240],
    inputs: { v_s: { role: 'manipulated', desc: 'source voltage [V]' } },
    params: { R: 'resistance [Ω]', L: 'inductance [H]', C: 'capacitance [F]' },
    elements: [
      { id: 'sum1', kind: 'sum', x: 90, y: 110, out: 'Ldi' },
      { id: 'gL', kind: 'gain', x: 200, y: 110, gain: '1/L', label: frac('1', 'L'), name: '1/L', out: 'di' },
      { id: 'int1', kind: 'gain', x: 290, y: 110, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'i_L' },
      { id: 'gC', kind: 'gain', x: 430, y: 110, gain: '1/C', label: frac('1', 'C'), name: '1/C', out: 'dvC' },
      { id: 'int2', kind: 'gain', x: 520, y: 110, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'v_C' },
      { id: 'gR', kind: 'gain', x: 235, y: 195, gain: 'R', label: 'R', name: 'R', out: 'v_R' },
    ],
    wires: [
      { src: 'v_s', dst: 'sum1', sign: '+', pts: [[15, 110], [77, 110]] },
      { src: 'sum1', dst: 'gL', pts: [[103, 110], [177, 110]] },
      { src: 'gL', dst: 'int1', pts: [[223, 110], [267, 110]] },
      { src: 'int1', dst: 'gC', pts: [[313, 110], [407, 110]] },
      { src: 'gC', dst: 'int2', pts: [[453, 110], [497, 110]] },
      { src: 'int2', pts: [[543, 110], [635, 110]] },
      { src: 'int1', dst: 'gR', tap: true, pts: [[355, 110], [355, 195], [258, 195]] },
      { src: 'gR', dst: 'sum1', sign: '-', pts: [[212, 195], [90, 195], [90, 123]] },
      { src: 'int2', dst: 'sum1', sign: '-', tap: true, pts: [[590, 110], [590, 30], [90, 30], [90, 97]] },
    ],
    labels: [
      { sym: 'v_s', x: 20, y: 100, anchor: 'start' },
      { sym: 'Ldi', x: 140, y: 100 },
      { sym: 'di', x: 245, y: 100 },
      { sym: 'i_L', x: 334, y: 100 },
      { sym: 'dvC', x: 475, y: 100 },
      { sym: 'v_C', x: 615, y: 100 },
      { sym: 'v_R', x: 150, y: 185 },
      { sym: 'v_C', x: 340, y: 22 },
    ],
    regions: [
      {
        n: 1, title: 'Voltage loop', members: ['sum1'], out: 'Ldi', box: [64, 84, 52, 52],
        show: 'v_s - v_R - v_C',
        hint: 'Three arrows arrive at this junction. Two of them come back from further along the diagram.',
        read: 'Kirchhoff\'s voltage law around the loop: whatever the source voltage is not spent across the resistor and capacitor appears across the inductor, as L·di/dt.',
      },
      {
        n: 2, title: 'Inductor', members: ['gL', 'int1'], out: 'i_L', box: [165, 78, 160, 64],
        show: 'Ldi/(L*s)',
        hint: 'Series blocks multiply: 1/L, then 1/s.',
        read: 'Inductor voltage over inductance is the rate of change of current; integrate it and you have the current. The inductor current is the first state.',
      },
      {
        n: 3, title: 'Resistor', members: ['gR'], out: 'v_R', box: [200, 163, 70, 64],
        show: 'R*i_L',
        hint: 'Follow the tap: which signal feeds this block?',
        read: 'Ohm\'s law. The current is tapped off and fed back through R. This path is the circuit\'s own damping: it removes energy in proportion to the current.',
      },
      {
        n: 4, title: 'Capacitor', members: ['gC', 'int2'], out: 'v_C', box: [395, 78, 160, 64],
        show: 'i_L/(C*s)',
        hint: 'Same shape as the inductor region, one domain over.',
        read: 'Current charges the capacitor: current over capacitance is dv/dt, integrated to the voltage. That voltage travels all the way back to the loop junction on a minus input.',
      },
    ],
    targets: [
      { kind: 'state', state: 'i_L', display: '(v_s - R*i_L - v_C)/L', lhs: '\\dot{i}_L', prompt: 'First state equation.',
        vars: ['i_L', 'v_C', 'v_s', 'R', 'L'] },
      { kind: 'state', state: 'v_C', display: 'i_L/C', lhs: '\\dot{v}_C', prompt: 'Second state equation.',
        vars: ['i_L', 'v_C', 'C'] },
      { kind: 'tf', out: 'v_C', in: 'v_s', lhs: '\\dfrac{V_C(s)}{V_s(s)}', prompt: 'Transfer function from source to capacitor voltage.',
        answer: '1/(L*C*s^2 + R*C*s + 1)', vars: ['R', 'L', 'C', 's'] },
    ],
    symbols: {
      v_s: { tex: 'v_s', svg: 'v_{s}' },
      Ldi: { tex: 'L\\,\\dot{i}_L', svg: 'L·di_{L}/dt' },
      di: { tex: '\\dot{i}_L', svg: 'di_{L}/dt' },
      i_L: { tex: 'i_L', svg: 'i_{L}' },
      dvC: { tex: '\\dot{v}_C', svg: 'dv_{C}/dt' },
      v_C: { tex: 'v_C', svg: 'v_{C}' },
      v_R: { tex: 'v_R', svg: 'v_{R}' },
    },
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'two-inertia',
    title: 'Two inertias on a flexible shaft',
    level: 'Three states · a grouped region',
    blurb: 'A motor inertia drives a load inertia through a shaft with torsional stiffness and damping. ' +
           'Motor torque is manipulated; load torque is a disturbance acting on the far end.',
    viewBox: [0, 0, 1100, 285],
    inputs: {
      T_m: { role: 'manipulated', desc: 'motor torque [N·m]' },
      T_L: { role: 'disturbance', desc: 'load torque [N·m]' },
    },
    params: {
      J1: 'motor inertia [kg·m²]', J2: 'load inertia [kg·m²]',
      K_s: 'shaft stiffness [N·m/rad]', B_s: 'shaft damping [N·m·s/rad]',
    },
    elements: [
      { id: 'sum1', kind: 'sum', x: 70, y: 100, out: 'J1dw1' },
      { id: 'gJ1', kind: 'gain', x: 185, y: 100, gain: '1/J1', label: frac('1', 'J_{1}'), name: '1/J₁', out: 'dw1' },
      { id: 'int1', kind: 'gain', x: 275, y: 100, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'w1' },
      { id: 'sum2', kind: 'sum', x: 365, y: 100, out: 'w_rel' },
      { id: 'int2', kind: 'gain', x: 480, y: 100, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'th_s' },
      { id: 'gK', kind: 'gain', x: 575, y: 100, gain: 'K_s', label: 'K_{s}', name: 'K_s', out: 'T_K' },
      { id: 'gB', kind: 'gain', x: 575, y: 185, gain: 'B_s', label: 'B_{s}', name: 'B_s', out: 'T_B' },
      { id: 'sum3', kind: 'sum', x: 665, y: 100, out: 'T_s' },
      { id: 'sum4', kind: 'sum', x: 790, y: 100, out: 'J2dw2' },
      { id: 'gJ2', kind: 'gain', x: 905, y: 100, gain: '1/J2', label: frac('1', 'J_{2}'), name: '1/J₂', out: 'dw2' },
      { id: 'int3', kind: 'gain', x: 995, y: 100, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'w2' },
    ],
    wires: [
      { src: 'T_m', dst: 'sum1', sign: '+', pts: [[15, 100], [57, 100]] },
      { src: 'sum1', dst: 'gJ1', pts: [[83, 100], [162, 100]] },
      { src: 'gJ1', dst: 'int1', pts: [[208, 100], [252, 100]] },
      { src: 'int1', dst: 'sum2', sign: '+', pts: [[298, 100], [352, 100]] },
      { src: 'sum3', dst: 'sum1', sign: '-', tap: true, pts: [[715, 100], [715, 30], [70, 30], [70, 87]] },
      { src: 'int3', dst: 'sum2', sign: '-', tap: true, pts: [[1040, 100], [1040, 265], [365, 265], [365, 113]] },
      { src: 'sum2', dst: 'int2', pts: [[378, 100], [457, 100]] },
      { src: 'sum2', dst: 'gB', tap: true, pts: [[410, 100], [410, 185], [552, 185]] },
      { src: 'int2', dst: 'gK', pts: [[503, 100], [552, 100]] },
      { src: 'gK', dst: 'sum3', sign: '+', pts: [[598, 100], [652, 100]] },
      { src: 'gB', dst: 'sum3', sign: '+', pts: [[598, 185], [665, 185], [665, 113]] },
      { src: 'sum3', dst: 'sum4', sign: '+', pts: [[678, 100], [777, 100]] },
      { src: 'T_L', dst: 'sum4', sign: '-', pts: [[790, 42], [790, 87]] },
      { src: 'sum4', dst: 'gJ2', pts: [[803, 100], [882, 100]] },
      { src: 'gJ2', dst: 'int3', pts: [[928, 100], [972, 100]] },
      { src: 'int3', pts: [[1018, 100], [1092, 100]] },
    ],
    labels: [
      { sym: 'T_m', x: 20, y: 90, anchor: 'start' },
      { sym: 'J1dw1', x: 122, y: 90 },
      { sym: 'dw1', x: 230, y: 90 },
      { sym: 'w1', x: 325, y: 90 },
      { sym: 'w_rel', x: 440, y: 90 },
      { sym: 'th_s', x: 528, y: 90 },
      { sym: 'T_K', x: 625, y: 90 },
      { sym: 'T_B', x: 628, y: 175 },
      { sym: 'T_s', x: 745, y: 90 },
      { sym: 'T_L', x: 800, y: 48, anchor: 'start' },
      { sym: 'J2dw2', x: 842, y: 90 },
      { sym: 'dw2', x: 950, y: 90 },
      { sym: 'w2', x: 1065, y: 90 },
      { sym: 'T_s', x: 390, y: 22 },
      { sym: 'w2', x: 700, y: 257 },
    ],
    regions: [
      {
        n: 1, title: 'Motor-side torque balance', members: ['sum1'], out: 'J1dw1', box: [44, 74, 52, 52],
        show: 'T_m - T_s',
        hint: 'Where does the minus input come from? Follow it back.',
        read: 'Newton\'s second law for the motor inertia: motor torque minus the torque the shaft pulls back with. The shaft torque is tapped from far down the diagram.',
      },
      {
        n: 2, title: 'Motor inertia', members: ['gJ1', 'int1'], out: 'w1', box: [150, 68, 160, 64],
        show: 'J1dw1/(J1*s)',
        hint: 'Series blocks multiply.',
        read: 'Net torque over inertia is angular acceleration; integrate to motor speed.',
      },
      {
        n: 3, title: 'Relative speed', members: ['sum2'], out: 'w_rel', box: [339, 74, 52, 52],
        show: 'w1 - w2',
        hint: 'One input is from the left, one from the far right.',
        read: 'The shaft only twists if its two ends turn at different speeds. The load speed comes all the way back on the minus input.',
      },
      {
        n: 4, title: 'Shaft compliance', members: ['int2', 'gK', 'gB', 'sum3'], out: 'T_s', box: [440, 66, 245, 150],
        show: '(K_s/s + B_s)*w_rel',
        hint: 'This region has two parallel paths from one input. Write each path, then add them at the junction.',
        read: 'The relative speed splits. One copy integrates to the twist angle and passes through the stiffness; the other goes straight through the damping. They add: a spring and damper in parallel. Several blocks, one equation. Grouping them is a choice, and a useful one.',
      },
      {
        n: 5, title: 'Load-side torque balance', members: ['sum4'], out: 'J2dw2', box: [764, 74, 52, 52],
        show: 'T_s - T_L',
        hint: 'The disturbance drops in from above.',
        read: 'Newton\'s law for the load: the shaft drives it and the load torque opposes it. The disturbance enters at the same junction as a physical torque, so it has the same units, which is why it belongs there.',
      },
      {
        n: 6, title: 'Load inertia', members: ['gJ2', 'int3'], out: 'w2', box: [870, 68, 160, 64],
        show: 'J2dw2/(J2*s)',
        hint: 'Same shape as region 2.',
        read: 'Net torque over load inertia, integrated to load speed, which is both the output and a feedback signal.',
      },
    ],
    targets: [
      { kind: 'state', state: 'w1', display: '(T_m - K_s*th_s - B_s*(w1 - w2))/J1', lhs: '\\dot{\\omega}_1', prompt: 'Motor speed state equation.',
        vars: ['w1', 'w2', 'th_s', 'T_m', 'T_L', 'J1', 'J2', 'K_s', 'B_s'] },
      { kind: 'state', state: 'th_s', display: 'w1 - w2', lhs: '\\dot{\\theta}_s', prompt: 'Shaft twist state equation.',
        vars: ['w1', 'w2', 'th_s'] },
      { kind: 'state', state: 'w2', display: '(K_s*th_s + B_s*(w1 - w2) - T_L)/J2', lhs: '\\dot{\\omega}_2', prompt: 'Load speed state equation.',
        vars: ['w1', 'w2', 'th_s', 'T_m', 'T_L', 'J1', 'J2', 'K_s', 'B_s'] },
      { kind: 'tf', out: 'w2', in: 'T_m', lhs: '\\dfrac{\\Omega_2(s)}{T_m(s)}', prompt: 'Motor torque to load speed (set T_L = 0). Harder: eliminate ω₁ first.',
        answer: '(B_s*s + K_s)/(s*(J1*J2*s^2 + (J1 + J2)*(B_s*s + K_s)))', vars: ['J1', 'J2', 'K_s', 'B_s', 's'] },
    ],
    symbols: {
      T_m: { tex: 'T_m', svg: 'T_{m}' },
      T_L: { tex: 'T_L', svg: 'T_{L}' },
      J1dw1: { tex: 'J_1\\dot{\\omega}_1', svg: 'J_{1}\\dot{ω}_{1}' },
      dw1: { tex: '\\dot{\\omega}_1', svg: '\\dot{ω}_{1}' },
      w1: { tex: '\\omega_1', svg: 'ω_{1}' },
      w_rel: { tex: '\\omega_{rel}', svg: 'ω_{rel}' },
      th_s: { tex: '\\theta_s', svg: 'θ_{s}' },
      T_K: { tex: 'T_K', svg: 'T_{K}' },
      T_B: { tex: 'T_B', svg: 'T_{B}' },
      T_s: { tex: 'T_s', svg: 'T_{s}' },
      J2dw2: { tex: 'J_2\\dot{\\omega}_2', svg: 'J_{2}\\dot{ω}_{2}' },
      dw2: { tex: '\\dot{\\omega}_2', svg: '\\dot{ω}_{2}' },
      w2: { tex: '\\omega_2', svg: 'ω_{2}' },
      J1: { tex: 'J_1' }, J2: { tex: 'J_2' }, K_s: { tex: 'K_s' }, B_s: { tex: 'B_s' },
    },
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'pendulum',
    title: 'Motor-driven pendulum',
    level: 'Nonlinear · operating point',
    blurb: 'A rod swinging under gravity, driven by a motor at the pivot, with viscous friction. ' +
           'Gravity torque depends on sin θ, so one block is not a simple gain.',
    viewBox: [0, 0, 700, 240],
    inputs: { T_m: { role: 'manipulated', desc: 'motor torque [N·m]' } },
    params: { J: 'inertia about pivot [kg·m²]', b: 'viscous friction [N·m·s/rad]', m: 'mass [kg]', g: 'gravity [m/s²]', l: 'distance to centre of mass [m]' },
    op: { theta: 'theta_op' },
    elements: [
      { id: 'sum1', kind: 'sum', x: 80, y: 110, out: 'Jdw' },
      { id: 'gJ', kind: 'gain', x: 185, y: 110, gain: '1/J', label: frac('1', 'J'), name: '1/J', out: 'dw' },
      { id: 'int1', kind: 'gain', x: 275, y: 110, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'w' },
      { id: 'int2', kind: 'gain', x: 400, y: 110, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'theta' },
      { id: 'gb', kind: 'gain', x: 260, y: 195, gain: 'b', label: 'b', name: 'b', out: 'T_b' },
      { id: 'fnG', kind: 'fn', x: 300, y: 35, w: 130, fn: 'm*g*l*sin(theta)', label: 'mgℓ·sin(θ)', name: 'gravity', out: 'T_g' },
    ],
    wires: [
      { src: 'T_m', dst: 'sum1', sign: '+', pts: [[15, 110], [67, 110]] },
      { src: 'gb', dst: 'sum1', sign: '-', pts: [[237, 195], [80, 195], [80, 123]] },
      { src: 'fnG', dst: 'sum1', sign: '-', pts: [[235, 35], [80, 35], [80, 97]] },
      { src: 'sum1', dst: 'gJ', pts: [[93, 110], [162, 110]] },
      { src: 'gJ', dst: 'int1', pts: [[208, 110], [252, 110]] },
      { src: 'int1', dst: 'int2', pts: [[298, 110], [377, 110]] },
      { src: 'int1', dst: 'gb', tap: true, pts: [[335, 110], [335, 195], [283, 195]] },
      { src: 'int2', pts: [[423, 110], [680, 110]] },
      { src: 'int2', dst: 'fnG', tap: true, pts: [[520, 110], [520, 35], [365, 35]] },
    ],
    labels: [
      { sym: 'T_m', x: 20, y: 100, anchor: 'start' },
      { sym: 'Jdw', x: 128, y: 100 },
      { sym: 'dw', x: 230, y: 100 },
      { sym: 'w', x: 356, y: 100 },
      { sym: 'theta', x: 640, y: 100 },
      { sym: 'T_b', x: 160, y: 185 },
      { sym: 'T_g', x: 160, y: 25 },
    ],
    regions: [
      {
        n: 1, title: 'Torque balance', members: ['sum1'], out: 'Jdw', box: [54, 84, 52, 52],
        show: 'T_m - T_b - T_g',
        hint: 'Three inputs: one from the left, one from below, one from above.',
        read: 'Every torque on the rod meets at one junction: the motor pushes, friction and gravity push back. The junction output is J·dω/dt, kept in torque units rather than divided through by J.',
      },
      {
        n: 2, title: 'Inertia', members: ['gJ', 'int1'], out: 'w', box: [150, 78, 160, 64],
        show: 'Jdw/(J*s)',
        hint: 'Series blocks multiply.',
        read: 'Torque over inertia, integrated to angular velocity.',
      },
      {
        n: 3, title: 'Angle', members: ['int2'], out: 'theta', box: [372, 80, 56, 60],
        show: 'w/s',
        hint: 'A lone integrator.',
        read: 'Angular velocity integrates to angle, the second state.',
      },
      {
        n: 4, title: 'Viscous friction', members: ['gb'], out: 'T_b', box: [225, 163, 70, 64],
        show: 'b*w',
        hint: 'Which state is tapped into this block?',
        read: 'Friction torque proportional to speed: linear physical state feedback of ω.',
      },
      {
        n: 5, title: 'Gravity (nonlinear)', members: ['fnG'], out: 'T_g', box: [225, 7, 150, 56],
        show: 'm*g*l*sin(theta)',
        hint: 'A nonlinear block applies its function to its input. It does not multiply.',
        read: 'Gravity torque is m·g·ℓ·sin θ. The block takes the angle state as its input and applies a function, which is why it is drawn wide with the function written in it. It is still state feedback, just not a constant gain.',
      },
    ],
    targets: [
      { kind: 'state', state: 'w', display: '(T_m - b*w - m*g*l*sin(theta))/J', lhs: '\\dot{\\omega}', prompt: 'Nonlinear state equation for ω.',
        vars: ['w', 'theta', 'T_m', 'J', 'b', 'm', 'g', 'l'] },
      { kind: 'state', state: 'theta', display: 'w', lhs: '\\dot{\\theta}', prompt: 'State equation for θ.',
        vars: ['w', 'theta'] },
      { kind: 'equilibrium', state: 'w', input: 'T_m', at: { theta: 'theta_op', w: '0' },
        lhs: 'T_{m,op}', prompt: 'Motor torque that holds the rod still at θ_op.',
        answer: 'm*g*l*sin(theta_op)', vars: ['m', 'g', 'l', 'theta_op'] },
      { kind: 'slope', element: 'fnG', wrt: 'theta',
        lhs: '\\left.\\dfrac{\\partial T_g}{\\partial \\theta}\\right|_{op}', prompt: 'Linearize the gravity block: its gain for small changes Δθ about θ_op.',
        answer: 'm*g*l*cos(theta_op)', vars: ['m', 'g', 'l', 'theta_op'] },
      { kind: 'tf', out: 'theta', in: 'T_m', linearized: true,
        lhs: '\\dfrac{\\Delta\\Theta(s)}{\\Delta T_m(s)}', prompt: 'Operating-point transfer function, with the gravity block replaced by its slope.',
        answer: '1/(J*s^2 + b*s + m*g*l*cos(theta_op))', vars: ['J', 'b', 'm', 'g', 'l', 'theta_op', 's'] },
    ],
    symbols: {
      T_m: { tex: 'T_m', svg: 'T_{m}' },
      Jdw: { tex: 'J\\dot{\\omega}', svg: 'J\\dot{ω}' },
      dw: { tex: '\\dot{\\omega}', svg: '\\dot{ω}' },
      w: { tex: '\\omega', svg: 'ω' },
      theta: { tex: '\\theta', svg: 'θ' },
      T_b: { tex: 'T_b', svg: 'T_{b}' },
      T_g: { tex: 'T_g', svg: 'T_{g}' },
      l: { tex: '\\ell' },
      theta_op: { tex: '\\theta_{op}' },
    },
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'valve-tank',
    title: 'Tank drained through a valve',
    level: 'Nonlinear · two-input block',
    blurb: 'Liquid flows into an open tank and drains through a valve at the bottom. ' +
           'Outflow grows with the square root of the level and with the valve opening, ' +
           'so the nonlinear block takes a state AND the manipulated input.',
    viewBox: [0, 0, 640, 265],
    inputs: {
      x: { role: 'manipulated', desc: 'valve opening [0–1]' },
      q_in: { role: 'disturbance', desc: 'inflow [m³/s]' },
    },
    params: { A: 'tank cross-section [m²]', c_v: 'valve coefficient [m^2.5/s]' },
    op: { h: 'h_op', x: 'x_op' },
    elements: [
      { id: 'sum1', kind: 'sum', x: 80, y: 100, out: 'Adh' },
      { id: 'gA', kind: 'gain', x: 185, y: 100, gain: '1/A', label: frac('1', 'A'), name: '1/A', out: 'dh' },
      { id: 'int1', kind: 'gain', x: 275, y: 100, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'h' },
      { id: 'fnQ', kind: 'fn', x: 220, y: 190, w: 130, fn: 'c_v*x*sqrt(h)', label: 'c_{v}·x·√h', name: 'valve', out: 'q_out' },
    ],
    wires: [
      { src: 'q_in', dst: 'sum1', sign: '+', pts: [[15, 100], [67, 100]] },
      { src: 'fnQ', dst: 'sum1', sign: '-', pts: [[155, 190], [80, 190], [80, 113]] },
      { src: 'sum1', dst: 'gA', pts: [[93, 100], [162, 100]] },
      { src: 'gA', dst: 'int1', pts: [[208, 100], [252, 100]] },
      { src: 'int1', pts: [[298, 100], [620, 100]] },
      { src: 'int1', dst: 'fnQ', tap: true, pts: [[400, 100], [400, 190], [285, 190]] },
      { src: 'x', dst: 'fnQ', pts: [[220, 255], [220, 210]] },
    ],
    labels: [
      { sym: 'q_in', x: 20, y: 90, anchor: 'start' },
      { sym: 'Adh', x: 128, y: 90 },
      { sym: 'dh', x: 230, y: 90 },
      { sym: 'h', x: 580, y: 90 },
      { sym: 'q_out', x: 118, y: 180 },
      { sym: 'x', x: 232, y: 250, anchor: 'start' },
    ],
    regions: [
      {
        n: 1, title: 'Volume balance', members: ['sum1'], out: 'Adh', box: [54, 74, 52, 52],
        show: 'q_in - q_out',
        hint: 'In minus out.',
        read: 'Conservation of volume: inflow minus outflow is the rate the stored volume changes, A·dh/dt.',
      },
      {
        n: 2, title: 'Tank area', members: ['gA', 'int1'], out: 'h', box: [150, 68, 160, 64],
        show: 'Adh/(A*s)',
        hint: 'Series blocks multiply.',
        read: 'Volume rate over area is level rate; integrate to level, the only state.',
      },
      {
        n: 3, title: 'Valve flow (nonlinear)', members: ['fnQ'], out: 'q_out', box: [148, 160, 145, 62],
        show: 'c_v*x*sqrt(h)',
        hint: 'Two signals enter this block. Its function uses both.',
        read: 'Outflow depends on the level (more pressure head) and on the valve opening. Both enter the one nonlinear block as inputs, so the manipulated input acts through a nonlinearity instead of adding at the junction.',
      },
    ],
    targets: [
      { kind: 'state', state: 'h', display: '(q_in - c_v*x*sqrt(h))/A', lhs: '\\dot{h}', prompt: 'Nonlinear state equation.',
        vars: ['h', 'x', 'q_in', 'A', 'c_v'] },
      { kind: 'equilibrium', state: 'h', input: 'q_in', at: { h: 'h_op', x: 'x_op' },
        lhs: 'q_{in,op}', prompt: 'Inflow that holds the level steady at h_op with the valve at x_op.',
        answer: 'c_v*x_op*sqrt(h_op)', vars: ['c_v', 'x_op', 'h_op'] },
      { kind: 'slope', element: 'fnQ', wrt: 'h',
        lhs: '\\left.\\dfrac{\\partial q_{out}}{\\partial h}\\right|_{op}', prompt: 'Linearized gain of the valve block with respect to level.',
        answer: 'c_v*x_op/(2*sqrt(h_op))', vars: ['c_v', 'x_op', 'h_op'] },
      { kind: 'slope', element: 'fnQ', wrt: 'x',
        lhs: '\\left.\\dfrac{\\partial q_{out}}{\\partial x}\\right|_{op}', prompt: 'Linearized gain of the valve block with respect to valve opening.',
        answer: 'c_v*sqrt(h_op)', vars: ['c_v', 'x_op', 'h_op'] },
      { kind: 'tf', out: 'h', in: 'x', linearized: true,
        lhs: '\\dfrac{\\Delta H(s)}{\\Delta X(s)}', prompt: 'Operating-point transfer function from valve opening to level.',
        answer: '-c_v*sqrt(h_op)/(A*s + c_v*x_op/(2*sqrt(h_op)))', vars: ['A', 'c_v', 'x_op', 'h_op', 's'] },
    ],
    symbols: {
      q_in: { tex: 'q_{in}', svg: 'q_{in}' },
      q_out: { tex: 'q_{out}', svg: 'q_{out}' },
      Adh: { tex: 'A\\dot{h}', svg: 'Aḣ' },
      dh: { tex: '\\dot{h}', svg: 'ḣ' },
      h: { tex: 'h', svg: 'h' },
      x: { tex: 'x', svg: 'x (valve)' },
      c_v: { tex: 'c_v' },
      x_op: { tex: 'x_{op}' },
      h_op: { tex: 'h_{op}' },
    },
  },
];

/** Region colours: saturated mid-tones that hold contrast on light and dark. */
export const REGION_COLORS = ['#d7263d', '#1b998b', '#f46036', '#7b2cbf', '#2e933c', '#c49102', '#d81b60', '#3d5a80'];

/**
 * Mass-spring-damper with physical and active state feedback, drawn for the
 * feedback tuner. Not a practice problem, but held to the same checks: the
 * tuner displays the state equation derived from this graph, and the verifier
 * confirms it equals M v' = F_cmd - (K_p+K_a) x - (C_p+C_a) v.
 *
 * `tone` colours a block or wire as part of the physical plant or the
 * controller; it has no effect on the algebra.
 */
export const feedbackDiagram = {
  id: 'msd-feedback',
  title: 'Mass-spring-damper with physical and active state feedback',
  viewBox: [0, 0, 760, 240],
  inputs: { F_cmd: { role: 'manipulated', desc: 'force command [N]' } },
  params: {},
  elements: [
    { id: 'sumA', kind: 'sum', x: 70, y: 110, out: 'F_act', tone: 'active' },
    { id: 'sumP', kind: 'sum', x: 200, y: 110, out: 'Mdv', tone: 'physical' },
    { id: 'gM', kind: 'gain', x: 290, y: 110, gain: '1/M', label: frac('1', 'M'), name: '1/M', out: 'dv', tone: 'physical' },
    { id: 'int1', kind: 'gain', x: 375, y: 110, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'v', tone: 'physical' },
    { id: 'int2', kind: 'gain', x: 520, y: 110, gain: '1/s', label: frac('1', 's'), name: '1/s', out: 'x', tone: 'physical' },
    { id: 'gCa', kind: 'gain', x: 300, y: 30, h: 30, gain: 'C_a', label: 'C_{a}', name: 'C_a', out: 'F_Ca', tone: 'active' },
    { id: 'gCp', kind: 'gain', x: 300, y: 65, h: 30, gain: 'C_p', label: 'C_{p}', name: 'C_p', out: 'F_Cp', tone: 'physical' },
    { id: 'gKp', kind: 'gain', x: 300, y: 170, h: 30, gain: 'K_p', label: 'K_{p}', name: 'K_p', out: 'F_Kp', tone: 'physical' },
    { id: 'gKa', kind: 'gain', x: 300, y: 210, h: 30, gain: 'K_a', label: 'K_{a}', name: 'K_a', out: 'F_Ka', tone: 'active' },
  ],
  wires: [
    { src: 'F_cmd', dst: 'sumA', sign: '+', pts: [[12, 110], [57, 110]], tone: 'active' },
    { src: 'sumA', dst: 'sumP', sign: '+', pts: [[83, 110], [187, 110]] },
    { src: 'sumP', dst: 'gM', pts: [[213, 110], [267, 110]] },
    { src: 'gM', dst: 'int1', pts: [[313, 110], [352, 110]] },
    { src: 'int1', dst: 'int2', pts: [[398, 110], [497, 110]] },
    { src: 'int2', pts: [[543, 110], [745, 110]] },
    { src: 'int1', dst: 'gCp', tap: true, pts: [[440, 110], [440, 65], [323, 65]], tone: 'physical' },
    { src: 'gCp', dst: 'sumP', sign: '-', pts: [[277, 65], [200, 65], [200, 97]], tone: 'physical' },
    { src: 'int1', dst: 'gCa', tap: true, pts: [[465, 110], [465, 30], [323, 30]], tone: 'active' },
    { src: 'gCa', dst: 'sumA', sign: '-', pts: [[277, 30], [70, 30], [70, 97]], tone: 'active' },
    { src: 'int2', dst: 'gKp', tap: true, pts: [[620, 110], [620, 170], [323, 170]], tone: 'physical' },
    { src: 'gKp', dst: 'sumP', sign: '-', pts: [[277, 170], [200, 170], [200, 123]], tone: 'physical' },
    { src: 'int2', dst: 'gKa', tap: true, pts: [[650, 110], [650, 210], [323, 210]], tone: 'active' },
    { src: 'gKa', dst: 'sumA', sign: '-', pts: [[277, 210], [70, 210], [70, 123]], tone: 'active' },
  ],
  labels: [
    { sym: 'F_cmd', x: 14, y: 100, anchor: 'start' },
    { sym: 'F_act', x: 135, y: 100 },
    { sym: 'Mdv', x: 240, y: 100 },
    { sym: 'v', x: 420, y: 100 },
    { sym: 'x', x: 700, y: 100 },
  ],
  regions: [],
  targets: [],
  symbols: {
    F_cmd: { tex: 'F_{cmd}', svg: 'F_{cmd}' },
    F_act: { tex: 'F_{act}', svg: 'F_{act}' },
    Mdv: { tex: 'M\\dot{v}', svg: 'M\\dot{v}' },
    v: { tex: 'v', svg: 'v' },
    x: { tex: 'x', svg: 'x' },
  },
  /** The state equation the tuner displays; verified against the graph. */
  velocityRow: '(F_cmd - (K_p + K_a)*x - (C_p + C_a)*v)/M',
};
