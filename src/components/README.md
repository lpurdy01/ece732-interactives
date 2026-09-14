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

## Planned, as the syllabus reaches them

| Component | Week | Purpose |
|---|---|---|
| `DynamicStiffness` | 4 | Sweep frequency, see T_L/θ, connect stiffness to disturbance rejection. |
| `DecouplingSandbox` | 5 | Cross-coupled two-input plant; toggle each decoupling type and see what it removes. |
| `ObserverLag` | 13–14 | State filter vs Gopinath/Luenberger observer, with and without the manipulated input, and where the lag comes from. |

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
