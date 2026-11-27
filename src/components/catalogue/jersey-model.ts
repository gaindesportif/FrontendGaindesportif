import * as THREE from 'three';
import type { JerseyDesign } from './jersey-preview-assets';

const { lerp, smoothstep } = THREE.MathUtils;
const halfTurn = Math.PI / 2;
const neckAngle = 0.45;
const armhole = 0.68;
const hemY = -0.77;

const steps = (from: number, to: number, divisions: number) =>
  Array.from({ length: divisions + 1 }, (_, index) => lerp(from, to, index / divisions));

const shoulderAngles = steps(neckAngle, halfTurn, 26);
const neckAngles = steps(-neckAngle, neckAngle, 30);
const panelAngles = [
  ...shoulderAngles
    .slice(1)
    .reverse()
    .map((angle) => -angle),
  ...neckAngles,
  ...shoulderAngles.slice(1),
];
const armholeRows = steps(armhole, 1, 19);
const panelRows = [...steps(0, armhole, 42).slice(0, -1), ...armholeRows];
const shoulderRows = steps(0, 1, 12);

function torsoWidth(height: number) {
  return (
    0.427 +
    0.078 * smoothstep(height, 0.36, 0.91) -
    0.019 * Math.exp(-((height - 0.26) ** 2) / 0.025)
  );
}

function panelPoint(angle: number, height: number, back: boolean) {
  const side = Math.sin(angle);
  const roundness = Math.cos(angle);
  const neckline = smoothstep(Math.abs(angle), 0, neckAngle) * (back ? 0.086 : 0.22);
  const top =
    (back ? 0.65 : 0.516) + neckline - 0.15 * smoothstep(Math.abs(angle), neckAngle, halfTurn);
  const vertical = smoothstep(height, 0.72, 1);
  const x = side * torsoWidth(height) + 0.013 * Math.sin(height * 4.7) * (1 - vertical);
  const y =
    hemY +
    1.42 * height +
    (top - 0.65) * vertical +
    (1 - smoothstep(height, 0, 0.2)) * (0.027 * side ** 2 + 0.01 * Math.sin(5 * angle));
  const armDepth =
    0.107 *
    Math.sin(Math.PI * 0.73 * smoothstep(height, armhole, 1)) *
    smoothstep(Math.abs(side), 0.72, 1);
  const body =
    roundness * (0.144 + 0.054 * Math.exp(-((height - 0.67) ** 2) / 0.08) + 0.041 * vertical);
  const lower = 1 - smoothstep(height, 0.62, 0.86);
  const flank = smoothstep(Math.abs(side), 0.24, 0.69);
  // The pressed name and digits flatten the knit across the centre of the back.
  const printArea = back
    ? (1 - flank) * smoothstep(height, 0.17, 0.35) * (1 - smoothstep(height, 0.76, 0.96))
    : 0;
  const cloth =
    roundness *
    (1 - 0.72 * printArea) *
    (0.022 * lower * Math.sin(angle * 12 + height * 5.6 + (back ? 0.9 : 0)) +
      0.018 * flank * Math.sin(angle * 20 - height * 14) * Math.sin(Math.PI * height) +
      0.009 * lower * Math.cos(angle * 27 + (height * 11) ** 1.14));
  const twist = 0.014 * Math.sin(4.1 * height - 0.6) + 0.012 * side;
  return new THREE.Vector3(x, y, (back ? -1 : 1) * (body + armDepth + cloth) + twist);
}

function shoulderPoint(angle: number, across: number) {
  const point = panelPoint(angle, 1, false).lerp(panelPoint(angle, 1, true), across);
  point.y += 0.033 * Math.sin(Math.PI * across);
  return point;
}

function fabricTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const rib = Math.cos((2 * Math.PI * x) / 16);
      const loop = Math.cos((2 * Math.PI * y) / 16 + 1.7 * rib);
      const pore = Math.max(0, -rib * loop) ** 3;
      const detail = 6 * Math.sin(x * 2.4 + y * 2.8);
      const shade = 153 + 23 * rib + 21 * loop - 45 * pore + detail;
      const index = (y * 128 + x) * 4;
      image.data.set([shade, shade, shade, 255], index);
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(26, 22);
  texture.anisotropy = 8;
  return texture;
}

function patch(
  columns: number[],
  rows: number[],
  point: (column: number, row: number) => THREE.Vector3,
  material: THREE.Material,
  reverse = false,
) {
  const positions: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (const row of rows) {
    for (const column of columns) {
      positions.push(...point(column, row));
      uv.push(
        (column - columns[0]) / (columns.at(-1)! - columns[0]),
        (row - rows[0]) / (rows.at(-1)! - rows[0]),
      );
    }
  }
  const stride = columns.length;
  for (let row = 1; row < rows.length; row++) {
    for (let column = 1; column < stride; column++) {
      const a = (row - 1) * stride + column - 1;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      if (reverse) index.push(a, c, b, b, c, d);
      else index.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function rolledEdge(points: THREE.Vector3[], radius: number, material: THREE.Material) {
  const closed = points.at(-1)!.distanceToSquared(points[0]) < 1e-10;
  const path = new THREE.CatmullRomCurve3(closed ? points.slice(0, -1) : points, closed);
  return new THREE.Mesh(
    new THREE.TubeGeometry(path, points.length * 2, radius, 6, closed),
    material,
  );
}

function addSleeve(
  group: THREE.Group,
  side: -1 | 1,
  fabric: THREE.Material,
  binding: THREE.Material,
  stitches: THREE.Material,
) {
  const seam = [
    ...armholeRows.map((height) => panelPoint(side * halfTurn, height, false)),
    ...shoulderRows.slice(1).map((across) => shoulderPoint(side * halfTurn, across)),
    ...armholeRows
      .slice(0, -1)
      .reverse()
      .map((height) => panelPoint(side * halfTurn, height, true)),
  ];
  const angles = [
    ...steps(0, 2.33, armholeRows.length - 1),
    ...steps(2.33, 3.95, shoulderRows.length - 1).slice(1),
    ...steps(3.95, 2 * Math.PI, armholeRows.length - 1).slice(1),
  ];
  // The terminal points are shared with the body and shoulder. The opposite rim is a true opening.
  const columns = angles.map((_, index) => index);
  function point(index: number, reach: number) {
    const angle = angles[index];
    const lower = -Math.cos(angle);
    const sway = Math.sin(angle);
    const cuff = new THREE.Vector3(
      side * (0.704 + 0.144 * lower + 0.013 * sway),
      0.338 + 0.15 * lower - 0.012 * sway,
      0.022 + 0.143 * sway,
    );
    const vertex = seam[index].clone().lerp(cuff, reach);
    const fullness = Math.sin(Math.PI * reach);
    vertex.x += side * fullness * (0.018 * lower + 0.009 * Math.sin(angle * 9));
    vertex.y += fullness * (0.043 * lower - 0.018);
    vertex.z += fullness * (0.044 * sway + 0.016 * Math.cos(angle * 7));
    return vertex;
  }
  group.add(
    patch(columns, steps(0, 0.9, 18), point, fabric, side === 1),
    patch(columns, steps(0.9, 1, 4), point, binding, side === 1),
    rolledEdge(
      columns.map((index) => point(index, 0.035)),
      0.004,
      stitches,
    ),
    rolledEdge(
      columns.map((index) => point(index, 0.91)),
      0.004,
      stitches,
    ),
    rolledEdge(
      columns.map((index) => point(index, 1)),
      0.005,
      binding,
    ),
  );
}

function addNeck(group: THREE.Group, binding: THREE.Material, stitches: THREE.Material) {
  const neckline = [
    ...neckAngles.map((angle) => panelPoint(angle, 1, false)),
    ...shoulderRows.slice(1).map((across) => shoulderPoint(neckAngle, across)),
    ...neckAngles
      .slice(0, -1)
      .reverse()
      .map((angle) => panelPoint(angle, 1, true)),
    ...shoulderRows
      .slice(0, -1)
      .reverse()
      .map((across) => shoulderPoint(-neckAngle, across)),
  ];
  const columns = neckline.map((_, index) => index);
  const point = (index: number, width: number) => {
    const vertex = neckline[index].clone();
    vertex.x *= 1 - 0.16 * width;
    vertex.z *= 1 - 0.12 * width;
    vertex.y += 0.03 * width;
    return vertex;
  };
  group.add(
    patch(columns, steps(0, 1, 5), point, binding),
    rolledEdge(
      columns.map((index) => point(index, 0.08)),
      0.004,
      stitches,
    ),
    rolledEdge(
      columns.map((index) => point(index, 0.97)),
      0.006,
      binding,
    ),
  );
}

function addFlocking(group: THREE.Group) {
  const surface = new THREE.PlaneGeometry(0.67, 0.775, 56, 56);
  const positions = surface.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    const x = -positions.getX(index);
    const y = positions.getY(index) + 0.064;
    let lower = 0;
    let upper = 1;
    let point = new THREE.Vector3();
    // Project the print onto the same draped surface used to cut the back panel.
    for (let sample = 0; sample < 14; sample++) {
      const height = (lower + upper) / 2;
      const center = panelPoint(0, height, true).x;
      const angle = Math.asin(THREE.MathUtils.clamp((x - center) / torsoWidth(height), -1, 1));
      point = panelPoint(angle, height, true);
      if (point.y < y) lower = height;
      else upper = height;
    }
    positions.setXYZ(index, -x, y, -point.z + 0.0028);
  }
  surface.computeVertexNormals();
  const lettering = new THREE.Mesh(surface, new THREE.MeshStandardMaterial());
  lettering.rotation.y = Math.PI;
  lettering.name = 'Flocage';
  group.add(lettering);
}

export function createJerseyModel(design: JerseyDesign) {
  const group = new THREE.Group();
  const knit = fabricTexture();
  const fabric = new THREE.MeshStandardMaterial({
    color: design.main,
    roughness: 0.83,
    bumpMap: knit,
    bumpScale: 0.006,
    side: THREE.DoubleSide,
  });
  const binding = new THREE.MeshStandardMaterial({
    color: design.trim,
    roughness: 0.89,
    bumpMap: knit,
    bumpScale: 0.004,
    side: THREE.DoubleSide,
  });
  const stitches = new THREE.MeshStandardMaterial({
    color: new THREE.Color(design.main).multiplyScalar(0.68),
    roughness: 0.98,
  });
  for (const back of [false, true]) {
    const panel = (angle: number, height: number) => panelPoint(angle, height, back);
    group.add(
      patch(panelAngles, panelRows, panel, fabric, back),
      rolledEdge(
        panelAngles.map((angle) => panel(angle, 0.025)),
        0.004,
        stitches,
      ),
      rolledEdge(
        panelAngles.map((angle) => panel(angle, 0)),
        0.005,
        fabric,
      ),
    );
  }
  for (const side of [-1, 1] as const) {
    const shoulder = (angle: number, across: number) => shoulderPoint(side * angle, across);
    group.add(
      patch(shoulderAngles, shoulderRows, shoulder, fabric, side === -1),
      rolledEdge(
        shoulderAngles.map((angle) => shoulder(angle, 0.55)),
        0.0035,
        stitches,
      ),
      rolledEdge(
        steps(0, armhole, 36).map((height) => panelPoint(side * halfTurn, height, false)),
        0.0035,
        stitches,
      ),
    );
    addSleeve(group, side, fabric, binding, stitches);
  }
  addNeck(group, binding, stitches);
  addFlocking(group);
  return group;
}
