// Single source for the interactives list; the home page and the index both read it.
export const week1 = [
  {
    href: '/interactives/eigenvector-geometry/',
    title: 'Geometric View of Eigenvectors',
    lecture: 'W1L3, slides 28–38',
    blurb: 'Map a circle of input vectors through M and watch the ellipse come out. ' +
           'Eigenvectors of M are the directions left unrotated — and, as the lecture ' +
           'is careful to point out, they are not the axes of the ellipse.',
  },
  {
    href: '/interactives/modal-decomposition/',
    title: 'Modal Analysis of Eigenvectors',
    lecture: 'W1L3, slides 39–51',
    blurb: 'The three-mass spring chain. Release it on a mode shape and every mass ' +
           'moves at one frequency; pull one mass instead and all three modes light up.',
  },
  {
    href: '/interactives/second-order-response/',
    title: 'Poles, Eigenvalues and Response',
    lecture: 'W1L2 + W1L3, slides 3–12',
    blurb: 'Mass-spring-damper. Move ζ and ωₙ, watch the poles slide and the step ' +
           'response change shape — and see that the poles are the eigenvalues of A.',
  },
];

export const week7 = [
  {
    href: '/interactives/motion-stiffness-tuning/',
    title: 'Tuning Motion Control by Dynamic Stiffness',
    lecture: 'W7L1',
    blurb: 'Active damping, active stiffness and integrated stiffness, each a straight line ' +
           'on the log-log stiffness plot. Put each bandwidth where two lines meet, read off ' +
           'the gains, and see how close the closed-loop poles land when the loops are a ' +
           'decade apart, and how far when they are not.',
  },
  {
    href: '/interactives/stiffness-bandwidth/',
    title: 'Dynamic Stiffness, Bandwidth and the Bode Plot',
    lecture: 'W7L1 + W7L2',
    blurb: 'Drag the three gains and watch the crossings move: b_a and b_p set f_v, ' +
           'K_sa sets f_p, K_isa sets f_ip. The same frequencies show up on Bode plots of ' +
           'each loop and of the closed loop, and in a load step and a sine command.',
  },
  {
    href: '/interactives/motion-command-paths/',
    title: 'Motion Commands and Velocity Feedforward',
    lecture: 'W7L1 + W7L2',
    blurb: 'State feedback and a classical P–PI cascade with the same poles. Give the state ' +
           'controller its velocity command, or the cascade its velocity feedforward, and the ' +
           'two become the same controller. Leave it off and a sine command lags.',
  },
  {
    href: '/interactives/resonant-load/',
    title: 'Resonant Load: Two Inertias on a Shaft',
    lecture: 'W7L2',
    blurb: 'A compliant shaft puts a peak and a notch between the two inertia lines of the ' +
           'stiffness plot. Cancel the shaft\'s pull on the motor and the load is left ringing ' +
           'on an undamped spring.',
  },
];

export const week6 = [
  {
    href: '/interactives/virtual-zero-reference/',
    title: 'The Virtual Zero Reference',
    lecture: 'W6L1',
    blurb: 'A proportional current loop settles short of its command because the ' +
           'winding resistance is a feedback gain with a command of zero. Two references, ' +
           'one current, and it lands on their weighted average. Decouple the resistance ' +
           'and the error is gone without an integrator — and so is some stiffness.',
  },
  {
    href: '/interactives/pi-current-regulator/',
    title: 'PI Current Regulation',
    lecture: 'W6L2',
    blurb: 'Controller zero on winding pole, and the loop is first order at the bandwidth ' +
           'you asked for. Slide the zero either side and the locus shows where the second ' +
           'pole goes: a slow tail one way, overshoot the other.',
  },
];

export const week5 = [
  {
    href: '/interactives/decoupling-derivation/',
    title: 'Deriving the Decoupling Matrix',
    lecture: 'W5L1 · step by step',
    blurb: 'Where the decoupling matrix comes from, in five steps you work through: ' +
           'the two things each actuator does, those written as a matrix, the matrix ' +
           'turned around by elimination and again by the 2 × 2 inverse recipe, and then ' +
           'the same matrix read as summing junctions and gain blocks.',
  },
  {
    href: '/interactives/input-decoupling/',
    title: 'Manipulated Input Decoupling',
    lecture: 'W5L1',
    blurb: 'Two actuators either side of a body each push it and turn it. Invert the ' +
           'geometry in the controller and one command moves only force, the other only ' +
           'torque. A wrong length is a gain error; mismatched actuators are a transient ' +
           'cross-coupling, and the null test tells the two apart.',
  },
  {
    href: '/interactives/disturbance-decoupling/',
    title: 'Disturbance and State Feedback Decoupling',
    lecture: 'W5L2',
    blurb: 'A car in a headwind on a hill. Drag is nonlinear feedback, so the eigenvalue ' +
           'moves with speed unless the controller cancels it. Four controllers on one plot ' +
           'of damping against operating speed: the flat line is the one you can predict.',
  },
];

export const week4 = [
  {
    href: '/interactives/motor-transfer-matrix/',
    title: 'DC Motor Transfer Functions',
    lecture: 'W4L1',
    blurb: 'Current makes torque, speed makes back-EMF. Both disturbance paths share ' +
           'one numerator, and its roots ride a circle, collide and split as the winding ' +
           'resistance moves. The closed forms are checked against a numeric solve of ' +
           '(sI−A)⁻¹B at every frequency — the two routes the lecture derives.',
  },
  {
    href: '/interactives/motor-state-feedback/',
    title: "Modifying a Motor's State Feedback",
    lecture: 'W4L2',
    blurb: 'Back-EMF is a physical feedback gain, and it was supplying most of the ' +
           'motor\'s low-frequency disturbance rejection. Decouple it and the stiffness ' +
           'at DC falls to the bearing drag. All four of the lecture\'s cases are the ' +
           'same expression with two terms switched on, drawn on one set of axes.',
  },
];

export const week3 = [
  {
    href: '/interactives/dynamic-stiffness/',
    title: 'Dynamic Stiffness and Disturbance Rejection',
    lecture: 'W3L1',
    blurb: 'Disturbance per unit response, plotted log-log because it has physical ' +
           'units. Physical R and L and the controller\'s R_a and L_a add in the same ' +
           'place, so they lift the same part of the curve — and the step response ' +
           'beside it has the corner frequency as its time constant.',
  },
  {
    href: '/interactives/voltage-source-stiffness/',
    title: 'The Notch in a Voltage Source',
    lecture: 'W3L2',
    blurb: 'Add the output capacitor and stiffness stops rising monotonically: there ' +
           'is a frequency where the supply is at its weakest. Damping the notch and ' +
           'keeping low-frequency stiffness pull against each other, and a load step ' +
           'shows both at once — sag from R_p, ringing at the notch.',
  },
  {
    href: '/interactives/eigenvalue-migration/',
    title: 'Eigenvalue Migration with Load',
    lecture: 'W3L2',
    blurb: 'The load sits inside A, so the poles move with whatever is plugged in. ' +
           'Switch the same plot to a root locus of a gain and watch it behave ' +
           'differently — which is the point the lecture makes twice.',
  },
];

export const week2 = [
  {
    href: '/interactives/diagram-decomposition/',
    title: 'Block Diagram to Equations',
    lecture: 'W2L1 + W2L2 · practice',
    blurb: 'Five original state block diagrams, from a heated block to a nonlinear valve. ' +
           "Number the regions, write each one's equation, then eliminate down to state " +
           'equations and transfer functions. Wrong answers are diagnosed: which sign, which block.',
  },
  {
    href: '/interactives/physical-active-feedback/',
    title: 'Physical and Active State Feedback',
    lecture: 'W2L1',
    blurb: "A controller's stiffness and damping gains add in parallel with the spring and " +
           'damper already there. Move them and watch the eigenvalues follow the totals, ' +
           'including when an active gain cancels the physical damping.',
  },
  {
    href: '/interactives/operating-point-linearization/',
    title: 'Operating-Point Linearization',
    lecture: 'W2L2',
    blurb: 'Taylor series about an operating point, and how far the approximation holds. ' +
           'Then a pendulum held at an angle: nonlinear and linearized models side by side ' +
           'as the step grows.',
  },
];

export const weeks = [
  { week: 7, items: week7 },
  { week: 6, items: week6 },
  { week: 5, items: week5 },
  { week: 4, items: week4 },
  { week: 3, items: week3 },
  { week: 2, items: week2 },
  { week: 1, items: week1 },
];
