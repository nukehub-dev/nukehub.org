import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, ChromaticAberration, Bloom } from '@react-three/postprocessing';
import { getPrimaryColor } from '@lib/themeColors';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
// Config
/* ------------------------------------------------------------------ */
const IMAGE_URL = '/assets/images/nukehub.png';
const THRESHOLD = 120;
const MAX_TEXTURE_SIZE = 160;

/* ------------------------------------------------------------------ */
// Vertex Shader
/* ------------------------------------------------------------------ */
const vertexShader = `
attribute vec3 position;
attribute vec2 uv;
attribute vec3 offset;
attribute float pindex;
attribute float angle;
attribute float aSize;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uRandom;
uniform float uDepth;
uniform float uSize;
uniform vec2 uTextureSize;
uniform sampler2D uTouch;
uniform vec2 uMouse;
uniform vec2 uMousePos;
uniform float uMouseHover;

varying vec2 vUv;
varying float vBrightness;
varying float vDepth;
varying float vRadial;

float random(float n) {
  return fract(sin(n) * 43758.5453123);
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                            + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                          dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float noise3D(vec3 p) {
  float n1 = snoise(p.xy + vec2(p.z * 0.7, p.z * 0.3));
  float n2 = snoise(p.yz * 0.6 + vec2(p.x * 0.4, 17.0));
  return n1 * 0.5 + n2 * 0.5;
}

void main() {
  vUv = uv;

  // Base position from image grid
  vec3 displaced = offset;
  displaced.xy -= uTextureSize * 0.5;
  float scale = 2.0 / max(uTextureSize.x, uTextureSize.y);
  displaced.xy *= scale;

  // Radial distance from center (before noise/rotation) for accent gradient
  float distFromCenter = length(displaced.xy);
  vRadial = distFromCenter;

  // Organic noise – stronger near mouse hover, subtle background everywhere
  vec3 noisePos = vec3(offset.x * 0.04, offset.y * 0.04, uTime * 0.06);
  float n = noise3D(noisePos);
  float n2 = noise3D(noisePos + vec3(43.7, 19.3, 7.1));

  float distToMouse = length(displaced.xy - uMousePos);
  float hoverMask = smoothstep(0.35, 0.0, distToMouse) * uMouseHover;
  float noiseAmount = 0.15 + 0.85 * hoverMask;

  displaced.xy += vec2(n, n2) * uRandom * noiseAmount;
  displaced.z += (n + n2) * uDepth * noiseAmount;

  // Spherical depth dome
  float bulge = -0.5 * exp(-distFromCenter * distFromCenter * 0.8);
  displaced.z += bulge;

  // Gentle z drift
  float rndz = random(pindex) + snoise(vec2(pindex * 0.1, uTime * 0.1));
  displaced.z += rndz * 0.03;

  // Mouse-driven rotation with dead zone:
  // 0° when hovering logo (dist < 0.35), ramps to 45° at screen edge
  float mouseDist = length(uMouse);
  float influence = smoothstep(0.35, 0.7, mouseDist);

  float rotY = -uMouse.x * 0.785 * influence;
  float cY = cos(rotY);
  float sY = sin(rotY);
  mat2 rotYMat = mat2(cY, -sY, sY, cY);
  displaced.xz = rotYMat * displaced.xz;

  float rotX = -uMouse.y * 0.785 * influence;
  float cX = cos(rotX);
  float sX = sin(rotX);
  mat2 rotXMat = mat2(cX, -sX, sX, cX);
  displaced.yz = rotXMat * displaced.yz;

  // Touch interaction – subtle ripple
  vec2 puv = offset.xy / uTextureSize;
  float t = texture2D(uTouch, puv).r;
  displaced.z += t * 0.2 * rndz;
  displaced.x += cos(angle) * t * 0.15 * rndz;
  displaced.y += sin(angle) * t * 0.15 * rndz;

  // Size varies by luminance
  float psize = uSize * aSize * (0.92 + 0.08 * random(pindex));

  // Billboard: quad always faces camera
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  mvPosition.xy += position.xy * psize;

  // Brightness + world-space depth for fragment dimming
  vBrightness = 0.85 + 0.3 * (n * 0.5 + 0.5);
  vDepth = displaced.z;

  gl_Position = projectionMatrix * mvPosition;
}
`;

/* ------------------------------------------------------------------ */
// Fragment Shader
/* ------------------------------------------------------------------ */
const fragmentShader = `
precision highp float;

uniform vec3 uColor;

varying vec2 vUv;
varying float vBrightness;
varying float vDepth;
varying float vRadial;

void main() {
  // Clean hard-edged circle
  float dist = distance(vUv, vec2(0.5));
  float t = 1.0 - smoothstep(0.38, 0.5, dist);

  if (t < 0.01) discard;

  // Depth dimming: closer (negative z) = brighter, further = dimmer
  float depthFade = 1.0 - clamp(vDepth * 0.4, -0.5, 0.5);

  // Radial accent: center bright, outer edge dimmed
  float radialFade = 1.0 - smoothstep(0.2, 0.85, vRadial);
  vec3 darkColor = uColor * 0.2;
  vec3 accentColor = mix(darkColor, uColor, radialFade);

  vec3 color = accentColor * vBrightness * depthFade * 1.3;
  gl_FragColor = vec4(color, t);
}
`;

/* ------------------------------------------------------------------ */
// Touch Texture
/* ------------------------------------------------------------------ */
class TouchTexture {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  trail: { x: number; y: number; age: number }[];
  maxAge: number;
  radius: number;
  lastX: number;
  lastY: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.trail = [];
    this.maxAge = 90;
    this.radius = 0.15 * Math.min(width, height);
    this.lastX = -1;
    this.lastY = -1;
  }

  addPoint(x: number, y: number) {
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    if (dx * dx + dy * dy < 0.0001) return;
    this.lastX = x;
    this.lastY = y;
    this.trail.push({ x, y, age: 0 });
  }

  update() {
    const { ctx, width, height, trail, maxAge, radius } = this;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.age++;

      if (p.age > maxAge) {
        trail.splice(i, 1);
        continue;
      }

      const alpha = 1.0 - p.age / maxAge;
      const r = radius * (0.5 + 0.5 * alpha);

      const grd = ctx.createRadialGradient(
        p.x * width, (1.0 - p.y) * height, 0,
        p.x * width, (1.0 - p.y) * height, r
      );
      grd.addColorStop(0, 'rgba(255, 255, 255, ' + (alpha * 0.9) + ')');
      grd.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x * width, (1.0 - p.y) * height, r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.texture.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ */
// Interactive Particle Cloud
/* ------------------------------------------------------------------ */
function ParticleCloud() {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const mouseActive = useRef(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const planeRef = useRef<THREE.Mesh | null>(null);
  const touchTextureRef = useRef<TouchTexture | null>(null);
  const materialRef = useRef<THREE.RawShaderMaterial | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    plane.name = 'touchPlane';
    group.add(plane);
    planeRef.current = plane;

    const onPointerMove = (clientX: number, clientY: number) => {
      mouseRef.current.x = (clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(clientY / window.innerHeight) * 2 + 1;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseActive.current = true;
      onPointerMove(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onDocEnter = () => { mouseActive.current = true; };
    const onDocLeave = () => { mouseActive.current = false; };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('mouseenter', onDocEnter);
    document.addEventListener('mouseleave', onDocLeave);

    let disposed = false;
    let particleMesh: THREE.Mesh | null = null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = IMAGE_URL;

    img.onload = () => {
      if (disposed) return;

      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > MAX_TEXTURE_SIZE || h > MAX_TEXTURE_SIZE) {
        const ratio = Math.min(MAX_TEXTURE_SIZE / w, MAX_TEXTURE_SIZE / h);
        w = Math.floor(w * ratio);
        h = Math.floor(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, w, h * -1);
      const imgData = ctx.getImageData(0, 0, w, h);
      const pixels = new Float32Array(imgData.data);

      const numPoints = w * h;
      let numVisible = 0;

      for (let i = 0; i < numPoints; i++) {
        const r = pixels[i * 4 + 0];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const a = pixels[i * 4 + 3];
        const lum = 0.21 * r + 0.72 * g + 0.07 * b;
        if (a > 20 && lum > THRESHOLD) numVisible++;
      }

      let minLum = 255;
      let maxLum = 0;
      for (let i = 0; i < numPoints; i++) {
        const r = pixels[i * 4 + 0];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const a = pixels[i * 4 + 3];
        const lum = 0.21 * r + 0.72 * g + 0.07 * b;
        if (a > 20 && lum > THRESHOLD) {
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
      }
      const lumRange = maxLum - minLum || 1;

      const geometry = new THREE.InstancedBufferGeometry();

      const positions = new THREE.BufferAttribute(new Float32Array(4 * 3), 3);
      positions.setXYZ(0, -0.5, 0.5, 0.0);
      positions.setXYZ(1, 0.5, 0.5, 0.0);
      positions.setXYZ(2, -0.5, -0.5, 0.0);
      positions.setXYZ(3, 0.5, -0.5, 0.0);
      geometry.setAttribute('position', positions);

      const uvs = new THREE.BufferAttribute(new Float32Array(4 * 2), 2);
      uvs.setXY(0, 0.0, 0.0);
      uvs.setXY(1, 1.0, 0.0);
      uvs.setXY(2, 0.0, 1.0);
      uvs.setXY(3, 1.0, 1.0);
      geometry.setAttribute('uv', uvs);

      geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1));

      const indices = new Uint16Array(numVisible);
      const offsets = new Float32Array(numVisible * 3);
      const angles = new Float32Array(numVisible);
      const sizes = new Float32Array(numVisible);

      for (let i = 0, j = 0; i < numPoints; i++) {
        const r = pixels[i * 4 + 0];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const a = pixels[i * 4 + 3];
        const lum = 0.21 * r + 0.72 * g + 0.07 * b;
        if (a <= 20 || lum <= THRESHOLD) continue;

        offsets[j * 3 + 0] = i % w;
        offsets[j * 3 + 1] = Math.floor(i / w);
        offsets[j * 3 + 2] = 0;

        indices[j] = i;
        angles[j] = Math.random() * Math.PI;
        sizes[j] = 0.5 + (lum - minLum) / lumRange;

        j++;
      }

      geometry.setAttribute('pindex', new THREE.InstancedBufferAttribute(indices, 1, false));
      geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3, false));
      geometry.setAttribute('angle', new THREE.InstancedBufferAttribute(angles, 1, false));
      geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 1, false));

      const touchSize = Math.max(64, Math.min(128, Math.floor(Math.max(w, h) * 0.5)));
      const touchTexture = new TouchTexture(touchSize, touchSize);
      touchTextureRef.current = touchTexture;

      const primaryColor = getPrimaryColor();

      const uniforms = {
        uTime: { value: 0 },
        uRandom: { value: 0.05 },
        uDepth: { value: 0.2 },
        uSize: { value: 0.0 },
        uTextureSize: { value: new THREE.Vector2(w, h) },
        uTouch: { value: touchTexture.texture },
        uColor: { value: new THREE.Color(primaryColor) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uMousePos: { value: new THREE.Vector2(999, 999) },
        uMouseHover: { value: 0.0 },
      };

      const material = new THREE.RawShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      materialRef.current = material;

      particleMesh = new THREE.Mesh(geometry, material);
      group.add(particleMesh);
      isReadyRef.current = true;
    };

    img.onerror = () => {};

    return () => {
      disposed = true;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseenter', onDocEnter);
      document.removeEventListener('mouseleave', onDocLeave);

      if (particleMesh) {
        group.remove(particleMesh);
        particleMesh.geometry.dispose();
        (particleMesh.material as THREE.RawShaderMaterial).dispose();
        particleMesh = null;
      }

      group.remove(plane);
      plane.geometry.dispose();
      (plane.material as THREE.Material).dispose();
      planeRef.current = null;
      isReadyRef.current = false;
    };
  }, [gl]);

  useEffect(() => {
    const updateColor = () => {
      if (materialRef.current) {
        materialRef.current.uniforms.uColor.value.set(getPrimaryColor());
      }
    };
    updateColor();
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useFrame((state) => {
    if (!isReadyRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;
    const material = materialRef.current;

    const targetSize = 0.022;
    material.uniforms.uSize.value += (targetSize - material.uniforms.uSize.value) * 0.04;
    material.uniforms.uTime.value = time;

    const targetX = mouseActive.current ? mouseRef.current.x : 0;
    const targetY = mouseActive.current ? mouseRef.current.y : 0;
    const lerpFactor = mouseActive.current ? 0.12 : 0.06;
    material.uniforms.uMouse.value.x += (targetX - material.uniforms.uMouse.value.x) * lerpFactor;
    material.uniforms.uMouse.value.y += (targetY - material.uniforms.uMouse.value.y) * lerpFactor;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    if (planeRef.current) {
      const intersects = raycasterRef.current.intersectObject(planeRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        material.uniforms.uMousePos.value.set(point.x, point.y);
        material.uniforms.uMouseHover.value = 1.0;
        if (intersects[0].uv) {
          touchTextureRef.current?.addPoint(intersects[0].uv.x, intersects[0].uv.y);
        }
      } else {
        material.uniforms.uMouseHover.value = 0.0;
      }
    }

    touchTextureRef.current?.update();
  });

  return <group ref={groupRef} />;
}

/* ------------------------------------------------------------------ */
// Floating dust particles for empty space
/* ------------------------------------------------------------------ */
function DustField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const count = 800;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 11;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
      vel[i * 3] = (Math.random() - 0.5) * 0.001;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.0005;
    }
    return { positions: pos, velocities: vel };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Theme-aware color: dim accent in dark mode, neutral gray in light
  useEffect(() => {
    const updateColor = () => {
      if (!matRef.current) return;
      const isDark = document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        const accent = new THREE.Color(getPrimaryColor());
        accent.multiplyScalar(0.45);
        matRef.current.color.copy(accent);
      } else {
        matRef.current.color.set('#a0a0a0');
      }
    };
    updateColor();
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      positions[ix] += velocities[ix];
      positions[ix + 1] += velocities[ix + 1];
      positions[ix + 2] += velocities[ix + 2];

      if (positions[ix] > 8) positions[ix] = -8;
      if (positions[ix] < -8) positions[ix] = 8;
      if (positions[ix + 1] > 5.5) positions[ix + 1] = -5.5;
      if (positions[ix + 1] < -5.5) positions[ix + 1] = 5.5;

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.3 + i);
      dummy.position.set(positions[ix], positions[ix + 1], positions[ix + 2]);
      dummy.scale.setScalar(0.012 + pulse * 0.008);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <circleGeometry args={[1, 6]} />
      <meshBasicMaterial ref={matRef} transparent opacity={0.3} depthWrite={false} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
// Exported Scene
/* ------------------------------------------------------------------ */
export function ShowcaseScene({ visible = true }: { visible?: boolean }) {
  return (
    <>
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.6}
        />
        <ChromaticAberration
          offset={[0.0008, 0.0003]}
          radialModulation={true}
          modulationOffset={0.25}
        />
      </EffectComposer>
      <ambientLight intensity={0.2} />
      {visible && <ParticleCloud />}
      {visible && <DustField />}
    </>
  );
}
