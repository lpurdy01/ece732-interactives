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
  { week: 4, items: week4 },
  { week: 3, items: week3 },
  { week: 2, items: week2 },
  { week: 1, items: week1 },
];
