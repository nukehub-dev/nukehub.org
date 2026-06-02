import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';

function toThreeColor(hex: string) {
  return new THREE.Color(hex);
}

function Galaxy({ primaryColor }: { primaryColor: string }) {
  const count = 3500;
  const arms = 5;
  const particleRef = useRef<THREE.Points>(null);

  const primary = useMemo(() => toThreeColor(primaryColor), [primaryColor]);
  const secondary = useMemo(() => {
    const c = toThreeColor(primaryColor);
    c.offsetHSL(0.08, 0, 0.15);
    return c;
  }, [primaryColor]);
  const coreColor = useMemo(() => {
    const c = toThreeColor(primaryColor);
    c.offsetHSL(-0.05, 0.2, 0.25);
    return c;
  }, [primaryColor]);

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const radius = t * 4.5 + Math.random() * 0.3;

      // Spiral arms
      const armIndex = i % arms;
      const armOffset = (armIndex / arms) * Math.PI * 2;
      const spiralAngle = t * Math.PI * 8 + armOffset + (Math.random() - 0.5) * 0.4;

      // Random scatter perpendicular to arm
      const spread = (1 - t * 0.6) * 0.35;
      const x = Math.cos(spiralAngle) * radius + (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread * 0.4;
      const z = Math.sin(spiralAngle) * radius + (Math.random() - 0.5) * spread;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Color: core is brighter/warmer, edges cooler
      const distFromCenter = Math.sqrt(x * x + z * z);
      const colorMix = Math.min(distFromCenter / 3, 1);
      let r: number, g: number, b: number;

      if (colorMix < 0.3) {
        // Core: warm bright
        const localMix = colorMix / 0.3;
        r = coreColor.r * (1 - localMix) + primary.r * localMix;
        g = coreColor.g * (1 - localMix) + primary.g * localMix;
        b = coreColor.b * (1 - localMix) + primary.b * localMix;
      } else {
        // Arms: primary to secondary
        const localMix = (colorMix - 0.3) / 0.7;
        r = primary.r * (1 - localMix) + secondary.r * localMix;
        g = primary.g * (1 - localMix) + secondary.g * localMix;
        b = primary.b * (1 - localMix) + secondary.b * localMix;
      }

      // Fade edges slightly
      const edgeFade = Math.max(0.4, 1 - distFromCenter / 5.5);
      r *= edgeFade;
      g *= edgeFade;
      b *= edgeFade;

      col[i * 3] = r;
      col[i * 3 + 1] = g;
      col[i * 3 + 2] = b;

      // Size: core particles larger, edges smaller
      sz[i] = (0.06 + Math.random() * 0.12) * (1 + (1 - t) * 1.5);
    }

    return { positions: pos, colors: col, sizes: sz };
  }, [primary, secondary, coreColor]);

  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  // Custom shader material for glowing points
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (500.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          float dist = length(position.xz);
          vAlpha = smoothstep(4.5, 1.0, dist);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.5);
          float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + vColor.r * 10.0);
          gl_FragColor = vec4(vColor * twinkle * 1.4, glow * vAlpha * 1.2);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (!particleRef.current) return;
    particleRef.current.rotation.y = state.clock.elapsedTime * 0.008;
    particleRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.003) * 0.05;
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={particleRef} geometry={particleGeo} material={shaderMaterial} />
  );
}

export function GalaxyScene({ isVisible }: { isVisible: boolean }) {
  const [color, setColor] = useState(() => getPrimaryColor());

  useEffect(() => {
    setColor(getPrimaryColor());
    const observer = new MutationObserver(() => setColor(getPrimaryColor()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Canvas
      dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
      camera={{ position: [0, 3, 7], fov: 55 }}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <Galaxy primaryColor={color} />
    </Canvas>
  );
}
