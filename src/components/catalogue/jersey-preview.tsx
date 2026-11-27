'use client';

import { Pause, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Flocking } from '@/lib/jersey-flocking';
import type { JerseyPreviewAsset } from './jersey-preview-assets';
import { createJerseyModel } from './jersey-model';
import styles from './catalogue.module.css';

let letteringFont: Promise<FontFace> | undefined;
function loadLetteringFont() {
  letteringFont ??= new FontFace('Flocage', 'url(/fonts/barlow-900.woff2)', { weight: '900' })
    .load()
    .then((font) => {
      document.fonts.add(font);
      return font;
    });
  return letteringFont.catch(() => undefined);
}

type PreviewValues = { flocking: Flocking; angle: number };
const fullTurnMs = 11000;

function wrapAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function releaseModel(model: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of [object.material].flat()) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    material.dispose();
  }
  for (const texture of textures) {
    const bitmap = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close();
    texture.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
}

function drawFlocking(canvas: HTMLCanvasElement, flocking: Flocking, color: string) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponible');
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.letterSpacing = `${width * 0.011}px`;
  context.font = `900 ${height * 0.145}px "Flocage", "Arial Narrow", sans-serif`;
  context.fillText(flocking.name.toLocaleUpperCase('fr'), width / 2, height * 0.19, width * 0.93);
  context.letterSpacing = `${width * 0.006}px`;
  context.font = `900 ${height * 0.56}px "Flocage", "Arial Narrow", sans-serif`;
  context.fillText(flocking.number, width / 2, height * 0.62, width * 0.79);
}

export function JerseyPreview({
  asset,
  flocking,
  onStandard,
}: {
  asset: JerseyPreviewAsset;
  flocking: Flocking;
  onStandard?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ pointerId: number; x: number }>(null);
  const [angle, setAngle] = useState(180);
  const [attempt, setAttempt] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const values = useRef<PreviewValues>({ flocking, angle: 180 });
  const render = useRef<(values: PreviewValues) => void>(undefined);
  const { name, number } = flocking;

  useEffect(() => {
    values.current.flocking = { name, number };
    render.current?.(values.current);
  }, [name, number]);

  const rotate = useCallback((degrees: number) => {
    values.current.angle = degrees;
    setAngle(Math.round(degrees));
    render.current?.(values.current);
  }, []);

  useEffect(() => {
    if (!spinning || status !== 'ready') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;
    const initialAngle = values.current.angle;
    let request: number;
    let previous: number | undefined;
    let elapsed = 0;

    function onPreferenceChange(event: MediaQueryListEvent) {
      if (event.matches) setSpinning(false);
    }

    function tick(now: number) {
      if (previous !== undefined && !document.hidden) elapsed += Math.min(now - previous, 64);
      previous = now;
      const progress = Math.min(1, elapsed / fullTurnMs);
      if (progress === 1) {
        rotate(initialAngle);
        setSpinning(false);
        return;
      }
      const eased = progress * progress * (3 - 2 * progress);
      rotate(wrapAngle(initialAngle + 360 * eased));
      request = requestAnimationFrame(tick);
    }

    request = requestAnimationFrame(tick);
    reducedMotion.addEventListener('change', onPreferenceChange);
    return () => {
      cancelAnimationFrame(request);
      reducedMotion.removeEventListener('change', onPreferenceChange);
    };
  }, [rotate, spinning, status]);

  function startDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (status !== 'ready' || !event.isPrimary || event.button !== 0) return;
    setSpinning(false);
    drag.current = { pointerId: event.pointerId, x: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLCanvasElement>) {
    const cursor = drag.current;
    if (cursor?.pointerId !== event.pointerId) return;
    const delta = (360 * (event.clientX - cursor.x)) / event.currentTarget.clientWidth;
    cursor.x = event.clientX;
    rotate(wrapAngle(values.current.angle + delta));
  }

  function endDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  useEffect(() => {
    const surface = canvas.current!;
    const abort = new AbortController();
    let renderer: THREE.WebGLRenderer | undefined;
    let model: THREE.Object3D | undefined;
    let sizeObserver: ResizeObserver | undefined;
    let changedMaterial: THREE.Material | undefined;

    function release() {
      render.current = undefined;
      sizeObserver?.disconnect();
      changedMaterial?.dispose();
      if (model) releaseModel(model);
      renderer?.dispose();
    }

    function fail() {
      if (abort.signal.aborted) return;
      abort.abort();
      release();
      setSpinning(false);
      setStatus('error');
    }

    function loseContext(event: Event) {
      event.preventDefault();
      fail();
    }

    surface.addEventListener('webglcontextlost', loseContext);
    async function load() {
      if ('url' in asset) {
        const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]);
        const response = await fetch(asset.url, { signal });
        if (!response.ok) throw new Error('Modèle indisponible');
        const data = await response.arrayBuffer();
        const gltf = await new GLTFLoader().parseAsync(data, '');
        if (abort.signal.aborted) {
          releaseModel(gltf.scene);
          return;
        }
        model = gltf.scene;
      } else {
        model = createJerseyModel(asset.design);
      }
      const flockingMesh = model.getObjectByName('Flocage');
      if (
        !(flockingMesh instanceof THREE.Mesh) ||
        !flockingMesh.geometry.getAttribute('uv') ||
        Array.isArray(flockingMesh.material)
      ) {
        throw new Error('Zone de flocage absente ou invalide');
      }
      const bounds = new THREE.Box3().setFromObject(model);
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('Modèle vide');

      const lettering = document.createElement('canvas');
      lettering.width = 1024;
      lettering.height = 1024;
      const texture = new THREE.CanvasTexture(lettering);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = 'design' in asset;
      changedMaterial = flockingMesh.material;
      flockingMesh.material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.025,
        depthWrite: false,
        roughness: 0.84,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xf5f7ff, 0xaaa497, 1.05));
      const key = new THREE.DirectionalLight(0xfff6eb, 2.3);
      key.position.set(-3, 4, 4);
      const fill = new THREE.DirectionalLight(0xeaf4fb, 0.9);
      fill.position.set(4, 0.8, 3);
      const rim = new THREE.DirectionalLight(0xfff9ee, 1.65);
      rim.position.set(2, 3, -4);
      scene.add(key, fill, rim);

      const pivot = new THREE.Group();
      model.position.sub(sphere.center);
      pivot.scale.setScalar(1 / sphere.radius);
      pivot.add(model);
      scene.add(pivot);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
      camera.position.set(0, 0.15, 3.78);
      camera.lookAt(0, 0, 0);
      const display = new THREE.WebGLRenderer({ canvas: surface, alpha: true, antialias: true });
      renderer = display;
      display.toneMapping = THREE.ACESFilmicToneMapping;
      display.toneMappingExposure = 1.03;
      display.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      texture.anisotropy = Math.min(8, display.capabilities.getMaxAnisotropy());
      let lastFlocking: Flocking | undefined;
      render.current = ({ flocking, angle }) => {
        if (lastFlocking !== flocking) {
          drawFlocking(lettering, flocking, asset.letteringColor);
          texture.needsUpdate = true;
          lastFlocking = flocking;
        }
        pivot.rotation.y = THREE.MathUtils.degToRad(angle);
        display.render(scene, camera);
      };
      const resize = () => {
        const size = surface.clientWidth;
        if (size > 0) {
          display.setSize(size, size, false);
          render.current?.(values.current);
        }
      };
      resize();
      sizeObserver = new ResizeObserver(resize);
      sizeObserver.observe(surface);
      void loadLetteringFont().then(() => {
        if (!abort.signal.aborted) {
          lastFlocking = undefined;
          render.current?.(values.current);
        }
      });
      setStatus('ready');
    }

    void load().catch(fail);
    return () => {
      surface.removeEventListener('webglcontextlost', loseContext);
      if (!abort.signal.aborted) {
        abort.abort();
        release();
      }
    };
  }, [asset, attempt]);

  return (
    <div className={styles.preview} aria-busy={status === 'loading'}>
      <div className={styles.previewStudio} hidden={status === 'error'}>
        <canvas
          key={attempt}
          ref={canvas}
          aria-hidden="true"
          data-ready={status === 'ready'}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
      </div>
      {status === 'loading' && <p role="status">Chargement du modèle 3D…</p>}
      {status === 'ready' && (
        <div className={styles.previewControls}>
          <label>
            Faire pivoter le maillot
            <span className={styles.previewAngle} aria-hidden="true">
              {angle}°
            </span>
            <input
              type="range"
              min={0}
              max={360}
              value={angle}
              aria-valuetext={`${angle}°`}
              onFocus={() => setSpinning(false)}
              onChange={(event) => {
                setSpinning(false);
                rotate(event.target.valueAsNumber);
              }}
            />
          </label>
          <div className={styles.previewActions}>
            <small>Glissez le maillot pour le faire pivoter.</small>
            <button
              type="button"
              className="button button-outline"
              aria-label={spinning ? 'Arrêter la rotation' : 'Lancer une rotation à 360°'}
              onClick={() => setSpinning(!spinning)}
            >
              {spinning ? <Pause size={15} aria-hidden /> : <RotateCw size={15} aria-hidden />}
              {spinning ? 'Arrêter' : 'Rotation 360°'}
            </button>
          </div>
        </div>
      )}
      {status === 'error' && (
        <>
          <p role="status">L’aperçu 3D n’a pas pu être chargé. Vos choix sont conservés.</p>
          {'design' in asset && (
            <div
              className={styles.flatFlocking}
              style={{ backgroundColor: asset.design.main, color: asset.letteringColor }}
              aria-label="Vue à plat du flocage"
              role="group"
            >
              <span>{name}</span>
              <strong>{number}</strong>
            </div>
          )}
          <button
            type="button"
            className="button button-outline"
            onClick={() => {
              setStatus('loading');
              setAttempt(attempt + 1);
            }}
          >
            Réessayer l’aperçu
          </button>
          {onStandard && (
            <button type="button" className="button button-outline" onClick={onStandard}>
              Voir le modèle standard
            </button>
          )}
        </>
      )}
    </div>
  );
}
