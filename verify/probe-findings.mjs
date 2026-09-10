import { eigen2, apply2, mul2, transpose2 } from '../src/lib/linalg.ts';
const deg = (u, v) => Math.acos(Math.max(-1, Math.min(1,
  (u[0]*v[0]+u[1]*v[1]) / (Math.hypot(...u)*Math.hypot(...v))))) * 180/Math.PI;

console.log('FINDING 1: negative eigenvalue -> angle is 180 deg, not 0');
const M1 = [-1, 0, 0, 2];
const e1 = eigen2(M1);
for (let i = 0; i < 2; i++) {
  const v = e1.vectors[i], Mv = apply2(M1, v);
  console.log(`  lambda=${e1.lambda[i].toFixed(2)}  v=[${v.map(x=>x.toFixed(2))}]  `
    + `angle(u,Mu)=${deg(v, Mv).toFixed(1)} deg`);
}
console.log('  -> tool says "on an eigenvector" only when angle < 1.5, so the');
console.log('     negative-eigenvalue case is MISSED and the hint is impossible.\n');

console.log('FINDING 2: M = cI returns the same eigenvector twice');
const M2 = [2, 0, 0, 2];
const e2 = eigen2(M2);
console.log(`  lambdas=${e2.lambda}  v1=[${e2.vectors[0]}]  v2=[${e2.vectors[1]}]`);
const indep = Math.abs(e2.vectors[0][0]*e2.vectors[1][1] - e2.vectors[0][1]*e2.vectors[1][0]);
console.log(`  |det[v1 v2]| = ${indep.toFixed(3)}  (0 means NOT a basis)\n`);

console.log('FINDING 2b: knock-on for MM^T ellipse axes (equal singular values)');
const M3 = [0, -1.5, 1.5, 0];            // rotation * uniform scale
const sym = eigen2(mul2(M3, transpose2(M3)));
console.log(`  MM^T lambdas=${sym.lambda}  axes=[${sym.vectors[0]}] [${sym.vectors[1]}]`);
const indep2 = Math.abs(sym.vectors[0][0]*sym.vectors[1][1] - sym.vectors[0][1]*sym.vectors[1][0]);
console.log(`  |det| = ${indep2.toFixed(3)} -> only one axis drawn if 0\n`);

console.log('FINDING 3: non-positive mass produces NaN rather than an error');
try {
  const { springModes } = await import('../src/lib/linalg.ts');
  const bad = springModes([1, 0, 1], [30, 30, 30]);
  console.log(`  omega = ${bad.omega}  (NaN means it silently produced garbage)`);
} catch (e) { console.log('  threw:', e.message); }
