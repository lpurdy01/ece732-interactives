/**
 * Small real-matrix routines for the Week 1 interactives.
 *
 * Deliberately hand-written rather than pulled from mathjs: every case needed
 * here is either closed-form (2x2) or a short classical algorithm (Jacobi for
 * symmetric matrices), and a study tool that shows a plausible-but-wrong curve
 * is worse than no tool. Keeping the numerics visible makes them checkable.
 */

export type Mat2 = [number, number, number, number]; // row-major: m11 m12 m21 m22
export type Vec2 = [number, number];

export function apply2(m: Mat2, v: Vec2): Vec2 {
  return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
}

export function mul2(a: Mat2, b: Mat2): Mat2 {
  return [
    a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  ];
}

export function transpose2(m: Mat2): Mat2 {
  return [m[0], m[2], m[1], m[3]];
}

export interface Eigen2 {
  real: boolean;
  /** Eigenvalues. When real=false BOTH entries hold the real part of the
   *  complex conjugate pair; the imaginary part is in `im`. */
  lambda: [number, number];
  im: number;
  /** Unit eigenvectors, only meaningful when real=true. */
  vectors: [Vec2, Vec2];
  /** M is a multiple of the identity: every direction is an eigenvector, and
   *  the two vectors returned are an arbitrary orthogonal basis. */
  isotropic: boolean;
  /** Repeated eigenvalue with only ONE independent eigenvector direction.
   *  The second entry in `vectors` repeats the first because no second
   *  independent one exists -- that is the truth about the matrix, not a bug,
   *  and the UI says so rather than drawing a fictitious second axis. */
  defective: boolean;
}

/**
 * Eigenvalues/eigenvectors of a 2x2 real matrix, in closed form.
 *
 * lambda^2 - tr*lambda + det = 0. A negative discriminant means a complex
 * conjugate pair: the map has a rotational component and there is no real
 * direction left unrotated -- which is exactly the case worth seeing in the
 * geometric view, so it is reported rather than hidden.
 */
export function eigen2(m: Mat2): Eigen2 {
  const [a, b, c, d] = m;
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr / 4 - det;

  if (disc < -1e-12) {
    const im = Math.sqrt(-disc);
    return {
      real: false, lambda: [tr / 2, tr / 2], im,
      vectors: [[1, 0], [0, 1]], isotropic: false, defective: false,
    };
  }

  const root = Math.sqrt(Math.max(disc, 0));
  const l1 = tr / 2 + root;
  const l2 = tr / 2 - root;

  // M = cI. Every direction is an eigenvector, so returning eigenvector2()
  // twice yields the SAME vector and the caller draws one axis where there
  // should be a whole plane. Hand back a genuine orthogonal basis instead.
  const isotropic = Math.abs(b) < 1e-12 && Math.abs(c) < 1e-12
                    && Math.abs(a - d) < 1e-12;
  if (isotropic) {
    return {
      real: true, lambda: [l1, l2], im: 0,
      vectors: [[1, 0], [0, 1]], isotropic: true, defective: false,
    };
  }

  const v1 = eigenvector2(m, l1);
  const v2 = eigenvector2(m, l2);
  // A repeated eigenvalue that is NOT cI is defective: there is genuinely only
  // one eigenvector direction. Report that rather than pretending otherwise.
  const independent = Math.abs(v1[0] * v2[1] - v1[1] * v2[0]);
  const defective = Math.abs(root) < 1e-9 && independent < 1e-9;

  return { real: true, lambda: [l1, l2], im: 0, vectors: [v1, v2],
           isotropic: false, defective };
}

/** Unit null-vector of (M - lambda I), picking whichever row is better conditioned. */
function eigenvector2(m: Mat2, lambda: number): Vec2 {
  const [a, b, c, d] = m;
  const r1: Vec2 = [a - lambda, b];
  const r2: Vec2 = [c, d - lambda];
  const use = Math.hypot(r1[0], r1[1]) >= Math.hypot(r2[0], r2[1]) ? r1 : r2;
  let v: Vec2 = [-use[1], use[0]];
  const n = Math.hypot(v[0], v[1]);
  if (n < 1e-12) return [1, 0]; // M is lambda*I: every direction is an eigenvector
  v = [v[0] / n, v[1] / n];
  // Keep orientation stable so the drawing does not flip as sliders move. The
  // deadband must apply to the first test too: without it, [-1e-13, 1] was
  // flipped to point DOWN while [1e-13, 1] pointed up, so a vertical
  // eigenvector jittered between the two on floating-point noise. (Found by
  // the external correctness review, 2026-09-14.)
  return v[0] < -1e-12 || (Math.abs(v[0]) <= 1e-12 && v[1] < 0) ? [-v[0], -v[1]] : v;
}

/**
 * Eigen-decomposition of a real symmetric n x n matrix by cyclic Jacobi
 * rotations. Returns eigenvalues ascending with matching eigenvector columns.
 * Symmetric-only is sufficient here: mass-spring stiffness problems are
 * symmetrized before they reach this.
 */
export function jacobiEigen(input: number[][], sweeps = 60):
    { values: number[]; vectors: number[][] } {
  const n = input.length;
  const a = input.map((row) => row.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-24) break;

    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const cos = 1 / Math.sqrt(t * t + 1);
        const sin = t * cos;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = cos * akp - sin * akq;
          a[k][q] = sin * akp + cos * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = cos * apk - sin * aqk;
          a[q][k] = sin * apk + cos * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p], vkq = v[k][q];
          v[k][p] = cos * vkp - sin * vkq;
          v[k][q] = sin * vkp + cos * vkq;
        }
      }
    }
  }

  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[i][i] - a[j][j]);
  return {
    values: order.map((i) => a[i][i]),
    vectors: Array.from({ length: n }, (_, r) => order.map((i) => v[r][i])),
  };
}

/**
 * Undamped mode shapes and natural frequencies for a chain of masses and
 * springs: M xddot = -K x.
 *
 * Solved as a symmetric problem via S = M^(-1/2) K M^(-1/2), whose eigenvectors
 * map back with phi = M^(-1/2) y. Using M^-1 K directly would be
 * non-symmetric and would need a general solver for no benefit.
 */
export function springModes(masses: number[], stiffness: number[]):
    { omega: number[]; shapes: number[][] } {
  const n = masses.length;
  // Guard first: a zero or negative mass makes 1/sqrt(m) infinite or NaN, and
  // the Jacobi solver happily returns a vector of NaNs that renders as an
  // empty plot rather than an error.
  masses.forEach((m, i) => {
    if (!(m > 0) || !Number.isFinite(m)) {
      throw new Error(`mass ${i + 1} must be a positive finite number, got ${m}`);
    }
  });
  stiffness.forEach((k, i) => {
    if (!(k > 0) || !Number.isFinite(k)) {
      throw new Error(`stiffness ${i + 1} must be a positive finite number, got ${k}`);
    }
  });

  const K = Array.from({ length: n }, () => new Array(n).fill(0));

  // Chain: ground-k0-m0-k1-m1-...-k(n-1)-m(n-1), free at the far end.
  for (let i = 0; i < n; i++) {
    K[i][i] += stiffness[i];
    if (i + 1 < n) {
      K[i][i] += stiffness[i + 1];
      K[i][i + 1] -= stiffness[i + 1];
      K[i + 1][i] -= stiffness[i + 1];
    }
  }

  const invSqrtM = masses.map((m) => 1 / Math.sqrt(m));
  const S = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => invSqrtM[i] * K[i][j] * invSqrtM[j]));

  const { values, vectors } = jacobiEigen(S);
  const omega = values.map((lam) => Math.sqrt(Math.max(lam, 0)));

  const shapes: number[][] = [];
  for (let mode = 0; mode < n; mode++) {
    let phi = vectors.map((row, i) => row[mode] * invSqrtM[i]);
    const peak = Math.max(...phi.map(Math.abs)) || 1;
    phi = phi.map((value) => value / peak);
    const first = phi.find((value) => Math.abs(value) > 1e-9) ?? 1;
    if (first < 0) phi = phi.map((value) => -value);  // stable sign
    shapes.push(phi);
  }
  return { omega, shapes };
}

/**
 * Solve the n x n system Ax = b by Gauss-Jordan elimination with partial
 * pivoting. (Gauss-Jordan, not Gaussian: the inner loop clears above and below
 * the pivot, so no back-substitution pass is needed.)
 *
 * Throws on a singular system. The earlier version skipped the column and
 * substituted zero, which returns a vector that does not solve Ax = b and
 * looks like an answer.
 */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-14) {
      throw new Error(
        `singular system: no usable pivot in column ${col}. ` +
        'Refusing to return a vector that does not solve Ax = b.');
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/* ---------------------------------------------------------------------------
   Complex arithmetic, and the one inverse-Laplace form the Week 3 disturbance
   interactives need.

   Both power-supply tools have to evaluate a transfer function at s = j*omega
   and invert a step response whose poles may be real or a conjugate pair.
   Doing that in complex arithmetic covers the underdamped, critically damped
   and overdamped cases with one expression, instead of three branches that
   each need their own test.
   --------------------------------------------------------------------------- */

export type Cx = [number, number];   // [real, imaginary]

export const cAdd = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]];
export const cSub = (a: Cx, b: Cx): Cx => [a[0] - b[0], a[1] - b[1]];
export const cMul = (a: Cx, b: Cx): Cx =>
  [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];

export function cDiv(a: Cx, b: Cx): Cx {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
}

export const cAbs = (a: Cx): number => Math.hypot(a[0], a[1]);

export function cExp(a: Cx): Cx {
  const m = Math.exp(a[0]);
  return [m * Math.cos(a[1]), m * Math.sin(a[1])];
}

/** Roots of s^2 + b*s + c, real or a conjugate pair. */
export function quadraticRoots(b: number, c: number): [Cx, Cx] {
  const disc = b * b / 4 - c;
  const root: Cx = disc >= 0 ? [Math.sqrt(disc), 0] : [0, Math.sqrt(-disc)];
  return [cAdd([-b / 2, 0], root), cSub([-b / 2, 0], root)];
}

/**
 * Inverse Laplace of (alpha*s + beta) / (k * s * (s - s1) * (s - s2)) --
 * the response of a second-order system with a first-order numerator to a
 * step, written as a sum of residues.
 *
 *   f(t) = (1/k) [ beta/(s1 s2)
 *                + (alpha s1 + beta)/(s1 (s1 - s2)) e^(s1 t)
 *                + (alpha s2 + beta)/(s2 (s2 - s1)) e^(s2 t) ]
 *
 * Returns a real-valued function of t: when s1 and s2 are a conjugate pair the
 * two exponential terms are conjugates too, so the imaginary parts cancel.
 *
 * Repeated roots make the residue form singular. Separating them by a relative
 * 1e-7 is indistinguishable from the limit at any resolution that can be
 * plotted, and avoids carrying a fourth case that nothing here exercises.
 */
export function stepResponseResidues(
  alpha: number, beta: number, k: number, s1In: Cx, s2In: Cx,
): (t: number) => number {
  let s1 = s1In, s2 = s2In;
  const scale = Math.max(cAbs(s1), cAbs(s2), 1e-30);
  if (cAbs(cSub(s1, s2)) < 1e-7 * scale) {
    s1 = cAdd(s1, [1e-7 * scale, 0]);
    s2 = cSub(s2, [1e-7 * scale, 0]);
  }
  const dc = cDiv([beta, 0], cMul(s1, s2));
  const r1 = cDiv(cAdd(cMul([alpha, 0], s1), [beta, 0]), cMul(s1, cSub(s1, s2)));
  const r2 = cDiv(cAdd(cMul([alpha, 0], s2), [beta, 0]), cMul(s2, cSub(s2, s1)));
  return (t: number) => (
    dc[0]
    + cMul(r1, cExp(cMul(s1, [t, 0])))[0]
    + cMul(r2, cExp(cMul(s2, [t, 0])))[0]
  ) / k;
}
