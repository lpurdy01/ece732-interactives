# ECE/ME 732 — Interactive Concept Tools

In-browser tools for building intuition about the topics in a graduate
control-systems course: the geometric and modal views of eigenvectors, and
second-order response.

**Live:** https://lpurdy01.github.io/ece732-interactives/

| Tool | What it is for |
|---|---|
| Geometric View of Eigenvectors | Map a circle of input vectors through **M** and watch the ellipse come out. Eigenvectors are the directions left unrotated — and they are *not* the axes of the ellipse; the eigenvectors of **MMᵀ** are. Both can be drawn at once. |
| Modal Analysis of Eigenvectors | A three-mass spring chain. Release it on a mode shape and every mass moves at one frequency; pull a single mass and all three modes light up, with a line spectrum showing how much each one carries. |
| Poles, Eigenvalues and Response | Mass-spring-damper. Poles slide on the constant-ωₙ arc as damping changes, and the poles of X(s)/F(s) are shown to be the eigenvalues of **A**. |

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
npm run build && node verify/verify-interactives.mjs
```

## Corrections welcome

If you find something wrong, please open an issue. An error in a study tool
teaches other people something false, so a report is genuinely useful.

## Licence

BSD 3-Clause. See LICENSE.
