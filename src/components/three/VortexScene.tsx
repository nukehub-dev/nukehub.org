import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';

function toThreeColor(hex: string) {
  return new THREE.Color(hex);
}

function SpiralVortex({ primaryColor }: { primaryColor: string }) {
  const count = 1200;
  const particleRef = useRef<THREE.Points>(null);
  const primary = useMemo(() => toThreeColor(primaryColor), [primaryColor]);

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 12 + Math.random() * 0.3;
      const radius = 0.3 + t * 3.5 + Math.random() * 0.2;
      const spread = (1 - t * 0.5) * 0.25;

      pos[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
      pos[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;

      // Color: bright center, fading to dim edges
      const brightness = 1.0 - t * 0.6;
      col[i * 3] = primary.r * brightness;
      col[i * 3 + 1] = primary.g * brightness;
      col[i * 3 + 2] = primary.b * brightness;

      // Size: larger in center, smaller at edges
      sz[i] = (0.03 + Math.random() * 0.04) * (1.2 + (1 - t) * 1.5);
    }

    return { positions: pos, colors: col, sizes: sz };
  }, [primary]);

  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vDist;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (350.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          vDist = length(position.xz);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vColor;
        varying float vDist;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.4);
          float twinkle = 0.8 + 0.2 * sin(uTime * 1.5 + vDist * 3.0);
          gl_FragColor = vec4(vColor * twinkle * 1.3, glow * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (!particleRef.current) return;
    particleRef.current.rotation.y = state.clock.elapsedTime * 0.04;
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={particleRef} geometry={particleGeo} material={shaderMaterial} />
  );
}

export function VortexScene({ isVisible }: { isVisible: boolean }) {
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
      camera={{ position: [0, 2.5, 6], fov: 50 }}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <SpiralVortex primaryColor={color} />
    </Canvas>
  );
}
