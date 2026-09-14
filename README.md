# ECE/ME 732 — Interactive Concept Tools

In-browser tools for building intuition about the topics in a graduate
control-systems course: the geometric and modal views of eigenvectors,
second-order response, reading state block diagrams as equations, physical and
active state feedback, and operating-point linearization.

**Live:** https://lpurdy01.github.io/ece732-interactives/

| Tool | What it is for |
|---|---|
| Geometric View of Eigenvectors | Map a circle of input vectors through **M** and watch the ellipse come out. Eigenvectors are the directions left unrotated — and they are *not* the axes of the ellipse; the eigenvectors of **MMᵀ** are. Both can be drawn at once. |
| Modal Analysis of Eigenvectors | A three-mass spring chain. Release it on a mode shape and every mass moves at one frequency; pull a single mass and all three modes light up, with a line spectrum showing how much each one carries. |
| Poles, Eigenvalues and Response | Mass-spring-damper. Poles slide on the constant-ωₙ arc as damping changes, and the poles of X(s)/F(s) are shown to be the eigenvalues of **A**. |
| Block Diagram to Equations | Practice. Cut a state block diagram into numbered regions, write one equation per region, then eliminate to state equations and transfer functions. Five original systems, from a heated block to a nonlinear valve. Wrong answers are diagnosed: which junction sign, which missing or inverted block. |
| Physical and Active State Feedback | A controller's stiffness and damping gains add in parallel with the spring and damper already there. Eigenvalues with and without the controller, and the path each takes as an active gain sweeps, including active damping that cancels the physical damper. |
| Operating-Point Linearization | A Taylor series about an operating point and the band over which it holds; then a pendulum's nonlinear and linearized models side by side as the torque step grows. |

## Not official course material

Built by Levi Purdy as a study aid. Not produced, reviewed, or endorsed by any
instructor or university. Contains no course handouts, lecture material, or
homework solutions — only general control-systems concepts written from scratch.
If something here disagrees with your lecture, the lecture is right.

## Built with AI assistance, and verified rather than trusted

These were written with AI assistance (Claude). That makes verification the
interesting part of the project, not an afterthought:

- **Numerics checked against known results** before use — eigenvalues of a
  symmetric example, a rotation matrix correctly reported as a complex pair,
  the top eigenvalue of MMᵀ equal to the squared maximum stretch, and the
  three-mass chain's natural frequencies against 2·√(k/m)·sin((2j−1)π/14).
- **A browser test suite** (`verify/verify-interactives.mjs`) drives every
  control in a real browser and asserts the *displayed* numbers against values
  computed independently in the test. It also checks that plots are not blank,
  that curves span their axes, that pages do not scroll sideways on a phone,
  and that both light and dark themes render.
- **Block diagrams are signal graphs, not pictures.** In the block-diagram
  practice tool every expected equation is derived from the diagram's wiring,
  so what is drawn and what is marked correct cannot disagree.
  `verify/verify-diagram-problems.mjs` checks the graphs themselves: every wire
  touches what it connects, and every stated transfer function matches an
  independent linear solve of the whole diagram.
- **An exhaustive sweep** (`verify/verify-sweep.mjs`) in Chromium and Firefox
  visits every reachable state rather than chosen scenarios: every practice
  answer typed through the UI, every slider at its extremes, every preset, junk
  input, three screen widths in both themes. It fails on NaN text, console
  errors, blank plots, and any control covered by another element. Its first
  run found four bugs the scenario tests had passed.
- **Independent model review** of the mathematics, separate from the model that
  wrote it.

That last step has caught genuine errors in these tools. One example, now
fixed and regression-tested: the geometry tool claimed that a vector lying on
an eigenvector is never rotated. That is false when the eigenvalue is negative —
the vector is reversed, 180° rather than 0° — so the tool silently missed every
negative eigenvector and told you to do something impossible.

```bash
npm install
npm run dev                      # http://localhost:4321
node verify/verify-diagram-problems.mjs
npm run build && node verify/verify-interactives.mjs && node verify/verify-sweep.mjs
```

## Corrections welcome

If you find something wrong, please open an issue. An error in a study tool
teaches other people something false, so a report is genuinely useful.

## Licence

BSD 3-Clause. See LICENSE.
