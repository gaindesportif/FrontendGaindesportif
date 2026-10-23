import * as THREE from 'three';
import { starSequence, type StarPhase } from './pillar-star-sequence';

export type PillarStarPalette = 'terrain' | 'ville' | 'identite';
export interface PillarStarScene {
  motion(value: boolean): void;
  palette(value: PillarStarPalette): void;
  hold(value: boolean): void;
  pointer(x: number, y: number): void;
  turn(): void;
  dispose(): void;
}

/** Étoile à cinq facettes : illustration de la vision Gaindé, sans asset distant. */
export function createPillarStarScene(
  host: HTMLElement,
  failed: () => void,
  phaseChanged: (phase: StarPhase) => void,
): PillarStarScene {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, host.clientWidth < 600 ? 1.6 : 1.7));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.dataset.testid = 'pillar-star-canvas';
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 40);
  camera.position.set(0, 0.1, 8.7);
  scene.add(new THREE.HemisphereLight(0xe9fff2, 0x223729, 1.6));
  const light = new THREE.DirectionalLight(0xfff4d0, 3);
  light.position.set(3, 4, 5);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0x8affcb, 3);
  rim.position.set(-4, 1, -2);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 1.5);
  fill.position.set(-3, -1, 4);
  scene.add(fill);
  const geometries: THREE.BufferGeometry[] = [],
    materials: THREE.Material[] = [],
    textures: THREE.Texture[] = [];
  const ownG = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.push(g);
    return g;
  };
  const ownM = <T extends THREE.Material>(m: T) => {
    materials.push(m);
    return m;
  };
  const facets = Array.from({ length: 5 }, (_, i) =>
    ownM(
      new THREE.MeshStandardMaterial({
        color: ['#e8bc54', '#53ac80', '#d9b45b', '#187953', '#f0d895'][i],
        roughness: 0.28,
        metalness: 0.68,
      }),
    ),
  );
  const root = new THREE.Group();
  scene.add(root);
  root.scale.setScalar(0.76);
  const parts: { mesh: THREE.Object3D; offset: THREE.Vector3 }[] = [];
  // Cinq facettes en volume : chaque branche rejoint le même cœur.
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI / 2 - (i * Math.PI * 2) / 5;
    const point = (a: number, radius: number) => [Math.cos(a) * radius, Math.sin(a) * radius];
    const shape = new THREE.Shape();
    const vertices = [
      [0, 0],
      point(angle + Math.PI / 5, 0.66),
      point(angle, 1.65),
      point(angle - Math.PI / 5, 0.66),
    ];
    vertices.forEach(([x, y], j) => (j ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    const geometry = ownG(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelSize: 0.035,
        bevelThickness: 0.045,
        bevelSegments: 3,
        steps: 1,
      }),
    );
    const mesh = new THREE.Mesh(geometry, facets[i]);
    root.add(mesh);
    parts.push({
      mesh,
      offset: new THREE.Vector3(
        Math.cos(angle) * 0.43,
        Math.sin(angle) * 0.43,
        i % 2 ? 0.13 : -0.1,
      ),
    });
    const edges = new THREE.LineSegments(
      ownG(new THREE.EdgesGeometry(geometry, 35)),
      ownM(new THREE.LineBasicMaterial({ color: '#ffe8a7', transparent: true, opacity: 0.32 })),
    );
    mesh.add(edges);
  }
  // Arcs sculptés : couleurs sénégalaises, tous derrière la pièce centrale.
  const ribbons = new THREE.Group();
  scene.add(ribbons);
  ribbons.position.set(0, 0.32, -0.8);
  ribbons.scale.setScalar(0.82);
  for (let j = 0; j < 3; j++) {
    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 1.7 + j * 2.1;
      pts.push(new THREE.Vector3(Math.cos(a) * 2.02, Math.sin(a) * 1.65, Math.sin(a * 2) * 0.48));
    }
    const mesh = new THREE.Mesh(
      ownG(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.027 + j * 0.009, 6, false),
      ),
      ownM(
        new THREE.MeshStandardMaterial({
          color: ['#2b9970', '#eac557', '#ce4937'][j],
          metalness: 0.5,
          roughness: 0.35,
        }),
      ),
    );
    mesh.rotation.set(0.25 + j * 0.35, 0.2, j * 0.4);
    ribbons.add(mesh);
  }
  const dustCount = 75,
    positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    positions[i * 3] = Math.sin(i * 53.7) * 3.1;
    positions[i * 3 + 1] = Math.cos(i * 27.9) * 2.7;
    positions[i * 3 + 2] = -2 - Math.abs(Math.sin(i)) * 2;
  }
  const dustG = ownG(new THREE.BufferGeometry());
  dustG.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(
    new THREE.Points(
      dustG,
      ownM(
        new THREE.PointsMaterial({
          color: '#dfc982',
          size: 0.012,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    ),
  );
  let phase: StarPhase = 'static';
  let holding = false;
  let playing = false,
    disposed = false,
    frame = 0,
    last = 0,
    elapsed = 0,
    sequenceElapsed = 0,
    targetTurn = 0,
    turn = 0,
    px = 0,
    py = 0,
    count = 0;
  function render(time?: number) {
    if (disposed) return;
    const dt = time !== undefined && last ? Math.max(0, Math.min((time - last) / 1000, 0.05)) : 0;
    if (time !== undefined) last = time;
    if (playing) elapsed += dt;
    const ease = playing ? 1 - Math.exp(-dt * 6) : 0;
    if (playing && !holding) sequenceElapsed += dt;
    const sequence = starSequence(sequenceElapsed);
    if (phase !== sequence.phase) {
      phase = sequence.phase;
      phaseChanged(phase);
    }
    turn += (targetTurn - turn) * ease;
    root.rotation.y = -0.28 + turn + px * 0.28 + Math.sin(elapsed * 0.4) * 0.12;
    root.rotation.x = -0.04 + py * 0.12;
    root.rotation.z = -0.08 + Math.sin(elapsed * 0.6) * 0.025;
    root.position.y = 0.36 + Math.sin(elapsed * 0.8) * 0.035;
    for (const part of parts)
      part.mesh.position.copy(part.offset).multiplyScalar(sequence.expansion);
    ribbons.rotation.z = Math.sin(elapsed * 0.18) * 0.08;
    renderer.render(scene, camera);
    host.dataset.frame = String(++count);
    host.dataset.phase = phase;
    host.dataset.expansion = sequence.expansion.toFixed(3);
  }
  function loop(time: number) {
    frame = 0;
    if (!playing || disposed) return;
    if (!last || time - last >= 30) render(time);
    frame = requestAnimationFrame(loop);
  }
  function resize() {
    if (disposed) return;
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 0.85 ? 10 : 8.7;
    camera.updateProjectionMatrix();
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const lost = (e: Event) => {
    e.preventDefault();
    api.dispose();
    failed();
  };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  const api: PillarStarScene = {
    motion(v) {
      playing = v;
      last = 0;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (v) frame = requestAnimationFrame(loop);
    },
    palette(v) {
      facets.forEach((material, i) => {
        material.color.set(
          v === 'ville'
            ? ['#fff2cd', '#d8dec7', '#e7c678', '#b5d3bb', '#f5db9e'][i]
            : v === 'identite'
              ? ['#bb9144', '#13583d', '#d8ad55', '#083c30', '#e2c276'][i]
              : ['#e8bc54', '#53ac80', '#d9b45b', '#187953', '#f0d895'][i],
        );
      });
      render();
    },
    hold(v) {
      holding = v;
    },
    pointer(x, y) {
      px = x;
      py = y;
      if (!playing) render();
    },
    turn() {
      targetTurn += Math.PI / 2;
      if (!playing) turn = targetTurn;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      playing = false;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
  return api;
}
