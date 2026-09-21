# Interactive components

The publishable half of the site: control-systems tools written from general
knowledge, carrying no course material. Numerics live in `../lib/linalg.ts` and
are checked against known closed-form results rather than eyeballed.

## Built

| Component | Lecture | What it should let you feel |
|---|---|---|
| `EigenvectorGeometry` | W1L3, 28–38 | Map a circle of inputs through **M** and get an ellipse. Eigenvectors are the directions left unrotated — and, per slide 32/35, they are *not* the ellipse axes; eigenvectors of **MMᵀ** are. Both are drawable at once, which is the fastest way to stop confusing them. |
| `ModalDecomposition` | W1L3, 39–51 | The three-mass chain from slide 41. Release it on a mode shape and every mass moves at one frequency; pull one mass and all three modes light up. Makes `T⁻¹AT = D` concrete. |
| `DiagramDecomposition` | W2L1 + W2L2 | Cut a state block diagram into numbered regions, write one equation per region, then eliminate down to state equations and transfer functions. Five original systems (thermal, RLC, two-inertia shaft, pendulum, valve tank). Each diagram is a **signal graph**, so the expected equation for any region is derived from the drawing and a wrong answer is diagnosed against deliberately broken copies of the graph (flipped sign, dropped input, missing or inverted block). `verify/verify-diagram-problems.mjs` checks the graphs, the geometry of the drawing, and every stated transfer function by independent linear solve. |
| `PhysicalActiveFeedback` | W2L1, 14–17 | Physical K_p, C_p and active K_a, C_a on a mass-spring-damper. The dynamics only see the sums; eigenvalues for passive-only and passive+active side by side, with the path each takes as an active gain sweeps. Includes the C_a = −C_p case. |
| `OperatingPointLinearization` | W2L2, 18–27 | Taylor series about an operating point with the band where it stays within tolerance, then a pendulum held at θ_op: nonlinear and linearized models integrated side by side, with closed-form steady states to land on. |
| `SecondOrderResponse` | W1L2 + W1L3, 3–12 | Mass-spring-damper. Poles slide on the constant-ωₙ arc as ζ changes. Shows that poles of X(s)/F(s) and eigenvalues of **A** are the same numbers, and reproduces slide 7 by overlaying the closed-form inverse Laplace result on an RK4 solution. |
| `DynamicStiffness` | W3L1, 13–21 | The current-source supply. Dynamic stiffness is disturbance per unit response, so it has physical units and goes on log-log axes, not in dB. R_a and L_a from the controller enter the equation in exactly the same place as R_p and L_p and lift the same part of the curve — which is the lecture's point, and also why the limits on R_a and L_a are sample rate and sensor noise rather than heat. The step response beside it closes the loop: its time constant is 1/(2π·f_b), the corner of the plot. |
| `VoltageSourceStiffness` | W3L2, 10–18 | Add C_p and the curve stops rising monotonically — there is a notch at f_r = 1/(2π√(L_pC_p)) where the supply is weakest, and R_p is what damps it. Raising R_p fills the notch but drops the whole 1/R_p shelf, so the two goals fight. A 1 A load step shows both at once: sag = R_p·i_o is the low-frequency asymptote, the ringing on top of it is at the notch. |
| `EigenvalueMigration` | W3L2, 11–14 | R_eq lives inside **A**, so sweeping the load traces an eigenvalue migration. The same plot switches to a root locus of a gain K on the lecture's sidebar plant, because slide 14 spends itself on the distinction: K enters linearly and only in the constant term, R_eq enters reciprocally and in both, and they look nothing alike. Step responses at the two ends of the load range are drawn together, which is what "unacceptable" means concretely. |
| `MotorTransferMatrix` | W4L1, 16–27 | The cross-coupled DC motor. Both dynamic stiffnesses share the numerator D(s) = JL_ps² + (L_pb_p+JR_p)s + K_eK_t+R_pb_p, whose roots are the stiffness zeros; K_eK_t nearly fixes their product, so they ride a circle of radius ωₙ until they collide at R_p = (L_pb_p+2√(JL_pK_eK_t))/J and split. Slide 25's three annotated cases are one slider apart. The closed forms run against a numeric solve of (sI−A)X = B_tot U at every frequency, which is the "same as direct substitution" claim on slide 23, checked. |
| `MotorStateFeedback` | W4L2, 15–24 | All four cases from one expression: R_eff = R_p − R̂_p + R_a and K_eff = K_e − K̂_e. Back-EMF is a *physical* state feedback gain supplying most of the motor's low-frequency stiffness, and decoupling it drops DC stiffness to b_p alone — slide 17's "much worse", in numbers. When K_eff = 0 the numerator factors and the pole cancels, so cases 1 and 3 land on the same curve exactly as slide 21 says. Over-cancelling R̂_p drives R_eff negative and the current loop goes unstable, which the readout reports. |

## Planned, as the syllabus reaches them

| Component | Week | Purpose |
|---|---|---|
| `DecouplingSandbox` | 5 | Cross-coupled two-input plant; toggle each decoupling type and see what it removes. |
| `ObserverLag` | 13–14 | State filter vs Gopinath/Luenberger observer, with and without the manipulated input, and where the lag comes from. |

## The two figures above each tool

Every tool that describes a real device now opens with the device drawn beside
its block diagram. This is not decoration: a slider labelled `R_p` is
meaningless until you can see which resistor it is and where that resistor
enters the algebra.

The correspondence is mechanical, not a matter of the reader's diligence. Parts
in `../lib/schematic.ts`, blocks in `../lib/diagram-svg.ts` and the sliders
themselves all carry `data-sym`, and `../lib/figure-sync.ts` binds them:

- **hover or focus anything** and every element sharing that symbol lights up,
  in both pictures and on the control, in either direction;
- **values are written at runtime** into `data-val` slots, never baked into the
  build, so a figure cannot print a number the page has not computed;
- **a part a case does not use goes grey** rather than disappearing, so the
  drawing does not reflow underneath you when you change cases.

`verify/verify-interactives.mjs` asserts that every visible slider symbol is
drawn in a visible figure, that no value slot is left empty, and that hovering
a control lights something. A slider added without a part, or a part whose tag
drifts away from its slider, fails the build rather than quietly teaching the
wrong correspondence.

## Conventions

- **Keep the physics honest.** A tool that shows a plausible-looking curve that
  is not the actual solution is worse than no tool, and it will teach you
  something false right before an exam. Where a closed form exists, plot it
  against an independent numerical solution and show the difference.
- Numerics run in the browser; no backend, so the site stays static.
- Each component is a plain `.astro` file with an inline module script — no UI
  framework, so there is no hydration model to reason about.
- Colours come from `themeColors()`, which reads the CSS custom properties, so
  light and dark both work.
- Canvases use `touch-action: none` and pointer events, so dragging works on a
  tablet without scrolling the page.
- **Every symbol on a control is drawn somewhere.** If a quantity is worth a
  slider it is worth a place in the picture, and the verification asserts it.
- **A panel that cannot be trusted says so.** Several tools cap their
  simulation window so a lightly damped case stays readable rather than
  becoming a band of ink. When that cap means a final value has not settled,
  the readout states it instead of quoting a number off an unsettled trace.
