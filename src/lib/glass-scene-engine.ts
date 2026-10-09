import * as THREE from 'three';
import {
  glassPalettes,
  scenePixelRatio,
  starOutline,
  transitionPose,
  type GlassUniverse,
} from './glass-scene-config';

export interface GlassSceneHandle {
  setMotion: (playing: boolean) => void;
  setUniverse: (universe: GlassUniverse) => void;
  setPointer: (x: number, y: number) => void;
  dispose: () => void;
}

/** Toutes les ressources de cette scène ont un propriétaire et sont libérées au démontage. */
export function createGlassScene(host: HTMLElement, onFailure: () => void): GlassSceneHandle {
  const failureCleanup: Array<() => void> = [];
  try {
    return buildGlassScene(host, onFailure, failureCleanup);
  } catch (error) {
    for (const release of failureCleanup.reverse()) {
      try {
        release();
      } catch {
        /* Le repli doit rester possible après une erreur GPU. */
      }
    }
    throw error;
  }
}

function buildGlassScene(
  host: HTMLElement,
  onFailure: () => void,
  failureCleanup: Array<() => void>,
): GlassSceneHandle {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: host.clientWidth >= 500,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  });
  if (!context) throw new Error('WebGL2 indisponible');

  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
  failureCleanup.push(() => {
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  });
  renderer.setClearColor(0x071a14, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(scenePixelRatio(window.devicePixelRatio, host.clientWidth));
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.testid = 'glass-canvas';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0.05, 7.3);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  failureCleanup.push(() => {
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    textures.forEach((value) => value.dispose());
  });
  const ownGeometry = <T extends THREE.BufferGeometry>(value: T) => {
    geometries.add(value);
    return value;
  };
  const ownMaterial = <T extends THREE.Material>(value: T) => {
    materials.add(value);
    return value;
  };

  // Studio de reflets généré localement : aucun HDR/CDN ni téléchargement au runtime.
  const studio = document.createElement('canvas');
  studio.width = 1024;
  studio.height = 512;
  const paint = studio.getContext('2d');
  if (!paint) throw new Error('Texture de studio indisponible');
  const gradient = paint.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#cadfd5');
  gradient.addColorStop(0.42, '#44685b');
  gradient.addColorStop(0.53, '#183629');
  gradient.addColorStop(1, '#09130f');
  paint.fillStyle = gradient;
  paint.fillRect(0, 0, 1024, 512);
  for (const [x, width, color] of [
    [130, 75, '#f3fff8'],
    [480, 30, '#fff0ba'],
    [760, 130, '#dcf7f0'],
  ] as const) {
    paint.fillStyle = color;
    paint.fillRect(x, 40, width, 310);
  }
  const studioTexture = new THREE.CanvasTexture(studio);
  studioTexture.mapping = THREE.EquirectangularReflectionMapping;
  studioTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(studioTexture);
  const pmrem = new THREE.PMREMGenerator(renderer);
  failureCleanup.push(() => pmrem.dispose());
  const environment = pmrem.fromEquirectangular(studioTexture);
  failureCleanup.push(() => environment.dispose());
  scene.environment = environment.texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xd6f8e3, 0x07150e, 0.65));
  const key = new THREE.DirectionalLight(0xfff4d6, 2.5);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x81eac6, 3);
  rim.position.set(4, 1, -2);
  scene.add(rim);

  // De légères ondulations de surface font glisser les bandes du studio dans le verre.
  const normalPixels = new Uint8Array(96 * 96 * 4);
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
      const index = (y * 96 + x) * 4;
      normalPixels[index] = 128 + Math.round(Math.sin(x * 0.07 + y * 0.035) * 45);
      normalPixels[index + 1] = 128 + Math.round(Math.cos(y * 0.06 + x * 0.02) * 30);
      normalPixels[index + 2] = 255;
      normalPixels[index + 3] = 255;
    }
  }
  const normalMap = new THREE.DataTexture(normalPixels, 96, 96);
  normalMap.magFilter = THREE.LinearFilter;
  normalMap.minFilter = THREE.LinearFilter;
  normalMap.needsUpdate = true;
  textures.add(normalMap);

  const glass = ownMaterial(
    new THREE.MeshPhysicalMaterial({
      color: glassPalettes.dakar.glass,
      metalness: 0.04,
      roughness: 0.055,
      transmission: 0.9,
      thickness: 0.85,
      ior: 1.48,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 2.6,
      attenuationColor: new THREE.Color('#5bc9a7'),
      attenuationDistance: 2.8,
      iridescence: 0.16,
      iridescenceIOR: 1.3,
      normalMap,
      normalScale: new THREE.Vector2(0.32, 0.2),
    }),
  );
  const reflectionTime = { value: 0 };
  // Une bande de studio stylisée complète les reflets physiques, sans bloom coûteux.
  glass.onBeforeCompile = (shader) => {
    shader.uniforms.gaindeTime = reflectionTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGaindePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGaindePosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float gaindeTime;\nvarying vec3 vGaindePosition;',
      )
      .replace(
        '#include <dithering_fragment>',
        `
        float bandPosition = vGaindePosition.x * 0.48 + vGaindePosition.y * 0.20 + sin(gaindeTime * 0.27) * 0.52;
        float softReflection = exp(-pow(bandPosition * 6.0, 2.0));
        float sharpReflection = exp(-pow((bandPosition - 0.12) * 42.0, 2.0));
        gl_FragColor.rgb += vec3(0.09, 0.20, 0.15) * softReflection + vec3(0.30, 0.42, 0.35) * sharpReflection;
        #include <dithering_fragment>
      `,
      );
  };
  glass.customProgramCacheKey = () => 'gainde-studio-glass-v1';
  const gold = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: '#e5bd65',
      metalness: 0.9,
      roughness: 0.21,
      envMapIntensity: 1.6,
    }),
  );
  const edgeMaterial = ownMaterial(
    new THREE.LineBasicMaterial({
      color: glassPalettes.dakar.edge,
      transparent: true,
      opacity: 0.6,
    }),
  );
  const emblem = new THREE.Group();
  scene.add(emblem);

  const outline = new THREE.Shape();
  starOutline().forEach(({ x, y }, index) =>
    index === 0 ? outline.moveTo(x, y) : outline.lineTo(x, y),
  );
  outline.closePath();
  const star = ownGeometry(
    new THREE.ExtrudeGeometry(outline, {
      depth: 0.5,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.09,
      bevelThickness: 0.1,
      steps: 1,
      curveSegments: 8,
    }),
  );
  star.center();
  const starBody = new THREE.Group();
  const glassEdge = ownMaterial(glass.clone());
  glassEdge.transmission = 0.35;
  glassEdge.metalness = 0.55;
  glassEdge.color.set('#bed9bc');
  glassEdge.normalMap = null;
  starBody.add(new THREE.Mesh(star, [glass, glassEdge]));
  const innerOutline = ownGeometry(
    new THREE.BufferGeometry().setFromPoints(
      starOutline(1.41, 0.69).map(({ x, y }) => new THREE.Vector3(x, y, 0.2)),
    ),
  );
  starBody.add(new THREE.LineLoop(innerOutline, edgeMaterial));
  starBody.add(
    new THREE.LineSegments(ownGeometry(new THREE.EdgesGeometry(star, 40)), edgeMaterial),
  );
  emblem.add(starBody);

  const ball = ownGeometry(new THREE.IcosahedronGeometry(1.36, 1));
  const ballBody = new THREE.Group();
  const ballGlass = ownMaterial(glass.clone());
  ballGlass.flatShading = true;
  ballBody.add(new THREE.Mesh(ball, ballGlass));
  ballBody.add(new THREE.LineSegments(ownGeometry(new THREE.EdgesGeometry(ball, 1)), edgeMaterial));
  ballBody.visible = false;
  emblem.add(ballBody);

  const knotBody = new THREE.Group();
  knotBody.add(
    new THREE.Mesh(ownGeometry(new THREE.TorusKnotGeometry(0.95, 0.28, 128, 14, 2, 3)), glass),
  );
  knotBody.visible = false;
  emblem.add(knotBody);

  // Le logo reste celui de la marque ; les formes autour sont symboliques, pas des produits.
  const seal = new THREE.Group();
  const ring = new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(0.44, 0.035, 12, 64)), gold);
  seal.add(ring);
  const logo = new THREE.TextureLoader().load(
    '/images/logo.webp',
    () => invalidate(),
    undefined,
    () => {},
  );
  logo.colorSpace = THREE.SRGBColorSpace;
  textures.add(logo);
  const logoMaterial = ownMaterial(new THREE.MeshBasicMaterial({ map: logo, color: '#f9f5e8' }));
  const face = new THREE.Mesh(ownGeometry(new THREE.CircleGeometry(0.41, 48)), logoMaterial);
  face.position.z = 0.02;
  seal.add(face);
  seal.position.z = 0.42;
  emblem.add(seal);

  const orbitGroup = new THREE.Group();
  const orbitMaterial = ownMaterial(
    new THREE.MeshBasicMaterial({
      color: '#b7d3a9',
      transparent: true,
      opacity: 0.22,
    }),
  );
  for (let index = 0; index < 2; index++) {
    const orbit = new THREE.Mesh(
      ownGeometry(new THREE.TorusGeometry(2.05 + index * 0.2, 0.006, 6, 100)),
      orbitMaterial,
    );
    orbit.rotation.set(0.85 + index * 0.35, 0.25, -0.2 + index * 0.7);
    orbitGroup.add(orbit);
  }
  scene.add(orbitGroup);

  const shards = new THREE.Group();
  const shardGeometry = ownGeometry(new THREE.OctahedronGeometry(1, 0));
  const positions = [
    [-1.9, 1.25, -0.5],
    [1.9, 1.0, -0.8],
    [-1.85, -1.25, 0.3],
    [1.85, -1.2, -0.2],
  ];
  positions.forEach(([x, y, z], index) => {
    const shard = new THREE.Mesh(shardGeometry, index % 2 ? glass : gold);
    shard.position.set(x, y, z);
    shard.scale.setScalar(index % 2 ? 0.19 : 0.11);
    shard.rotation.set(index * 0.6, 0.3, 0.5);
    shards.add(shard);
  });
  scene.add(shards);

  let disposed = false;
  let playing = true;
  let visible = true;
  let frame: number | null = null;
  let lastFrame = 0;
  let phase = 0;
  let frames = 0;
  let scroll = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetUniverse: GlassUniverse = 'dakar';
  let currentUniverse: GlassUniverse = 'dakar';
  let transition = 1;
  let transitionUniverse: GlassUniverse = 'dakar';
  let swapped = true;
  const targetColor = new THREE.Color(glassPalettes.dakar.glass);
  const targetEdge = new THREE.Color(glassPalettes.dakar.edge);
  const targetAccent = new THREE.Color(glassPalettes.dakar.accent);

  function draw(delta: number) {
    if (disposed) return;
    const moving = playing && visible && !document.hidden;
    if (moving) phase += Math.min(delta, 0.05);
    reflectionTime.value = phase;
    const damping = moving ? 0.08 : 1;
    if (!moving) {
      transition = 1;
      swapped = true;
      transitionUniverse = targetUniverse;
    } else if (currentUniverse !== targetUniverse && transition >= 1) {
      transition = 0;
      swapped = false;
      transitionUniverse = targetUniverse;
    }
    // Avant la fermeture, privilégier le dernier choix en cas de clics rapides.
    if (!swapped) transitionUniverse = targetUniverse;
    if (moving && transition < 1)
      transition = Math.min(1, transition + Math.min(delta, 0.1) / 0.95);
    if (!moving || (!swapped && transition >= 0.5)) {
      currentUniverse = moving ? transitionUniverse : targetUniverse;
      swapped = true;
      starBody.visible = currentUniverse === 'dakar';
      ballBody.visible = currentUniverse === 'senegal';
      knotBody.visible = currentUniverse === 'accessoires';
      seal.position.z = currentUniverse === 'dakar' ? 0.42 : 1.45;
    }
    const { scale, turn } = transitionPose(transition);
    emblem.scale.setScalar(scale);
    const rotationY =
      0.3 + (moving ? Math.sin(phase * 0.38) * 0.42 + pointerX * 0.24 + scroll * 0.7 : 0);
    if (moving || frames === 0) {
      emblem.rotation.y = THREE.MathUtils.lerp(emblem.rotation.y, rotationY + turn, damping);
      emblem.rotation.x = THREE.MathUtils.lerp(
        emblem.rotation.x,
        0.13 + (moving ? pointerY * 0.13 + Math.sin(phase * 0.25) * 0.08 : 0),
        damping,
      );
      emblem.rotation.z = moving ? Math.sin(phase * 0.27) * 0.07 - 0.06 : -0.06;
      emblem.position.y = moving ? Math.sin(phase * 0.7) * 0.08 : 0;
      orbitGroup.rotation.z = moving ? phase * 0.035 : 0;
    }
    shards.children.forEach((shard, index) => {
      if (moving) shard.rotation.y = phase * 0.18 + index;
    });
    glass.color.lerp(targetColor, damping);
    ballGlass.color.copy(glass.color);
    edgeMaterial.color.lerp(targetEdge, damping);
    gold.color.lerp(targetAccent, damping);
    renderer.render(scene, camera);
    host.dataset.frames = String(++frames);
    host.dataset.universe = currentUniverse;
    host.dataset.running = String(moving);
    host.dataset.transition = transition < 1 ? 'changing' : 'idle';
  }

  function tick(now: number) {
    frame = null;
    if (disposed || !playing || !visible || document.hidden) return;
    // 30 images/s sur mobile, 45 sur desktop ; aucun render React à chaque image.
    const interval = host.clientWidth < 500 ? 1000 / 30 : 1000 / 45;
    if (now - lastFrame >= interval) {
      try {
        draw(lastFrame ? (now - lastFrame) / 1000 : 0);
      } catch {
        handle.dispose();
        onFailure();
        return;
      }
      lastFrame = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function invalidate() {
    if (disposed) return;
    if (!playing || !visible || document.hidden) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastFrame = 0;
      draw(0);
    } else if (frame === null) {
      frame = requestAnimationFrame(tick);
    }
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setPixelRatio(scenePixelRatio(window.devicePixelRatio, width));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = Math.max(7.3, 7.3 / Math.max(camera.aspect, 0.6));
    camera.updateProjectionMatrix();
    invalidate();
  }
  function onScroll() {
    const rect = host.getBoundingClientRect();
    scroll = THREE.MathUtils.clamp(-rect.top / Math.max(rect.height, 1), 0, 1);
  }
  function onVisibility() {
    invalidate();
  }
  function onContextLost(event: Event) {
    event.preventDefault();
    handle.dispose();
    onFailure();
  }
  const resizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      invalidate();
    },
    { threshold: 0.01 },
  );
  resizeObserver.observe(host);
  visibilityObserver.observe(host);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);

  const handle: GlassSceneHandle = {
    setMotion(value) {
      playing = value;
      invalidate();
    },
    setUniverse(value) {
      targetUniverse = value;
      targetColor.set(glassPalettes[value].glass);
      targetEdge.set(glassPalettes[value].edge);
      targetAccent.set(glassPalettes[value].accent);
      invalidate();
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
  failureCleanup.length = 0;
  failureCleanup.push(() => handle.dispose());
  resize();
  draw(0);
  return handle;
}
