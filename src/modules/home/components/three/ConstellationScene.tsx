import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';

function toThreeColor(hex: string) {
  return new THREE.Color(hex);
}

function Constellation({ primaryColor }: { primaryColor: string }) {
  const count = 45;
  const mainNodes = 3;
  const particleRef = useRef<THREE.Points>(null);
  const lineRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);

  const primary = useMemo(() => toThreeColor(primaryColor), [primaryColor]);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    // Main nodes - larger, arranged in a loose triangle
    for (let i = 0; i < mainNodes; i++) {
      const angle = (i / mainNodes) * Math.PI * 2;
      const radius = 1.6 + Math.random() * 0.4;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius * 0.35;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      vel[i * 3] = (Math.random() - 0.5) * 0.0006;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.0006;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.0003;
    }

    // Smaller ambient particles
    for (let i = mainNodes; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 11;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      vel[i * 3] = (Math.random() - 0.5) * 0.0008;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.0008;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.0004;
    }

    return { positions: pos, velocities: vel };
  }, []);

  const particleColors = useMemo(() => {
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < mainNodes; i++) {
      cols[i * 3] = primary.r;
      cols[i * 3 + 1] = primary.g;
      cols[i * 3 + 2] = primary.b;
    }
    for (let i = mainNodes; i < count; i++) {
      const mix = 0.6 + Math.random() * 0.25;
      cols[i * 3] = primary.r * mix + 1 * (1 - mix);
      cols[i * 3 + 1] = primary.g * mix + 1 * (1 - mix);
      cols[i * 3 + 2] = primary.b * mix + 1 * (1 - mix);
    }
    return cols;
  }, [primary]);

  const particleSizes = useMemo(() => {
    const sz = new Float32Array(count);
    for (let i = 0; i < mainNodes; i++) sz[i] = 0.16;
    for (let i = mainNodes; i < count; i++) sz[i] = 0.05 + Math.random() * 0.07;
    return sz;
  }, []);

  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(particleColors.slice(), 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particleSizes.slice(), 1));
    return geo;
  }, [positions, particleColors, particleSizes]);

  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(count * count * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!particleRef.current || !groupRef.current) return;

    const posAttr = particleRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;

    // Slowly rotate the entire constellation
    groupRef.current.rotation.y = t * 0.015;
    groupRef.current.rotation.x = Math.sin(t * 0.008) * 0.04;

    // Update ambient particle positions
    for (let i = mainNodes; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      if (Math.abs(posArray[i * 3]) > 5.5) velocities[i * 3] *= -1;
      if (Math.abs(posArray[i * 3 + 1]) > 2.8) velocities[i * 3 + 1] *= -1;
      if (Math.abs(posArray[i * 3 + 2]) > 1.5) velocities[i * 3 + 2] *= -1;
    }

    // Main nodes orbit slowly
    for (let i = 0; i < mainNodes; i++) {
      const baseAngle = (i / mainNodes) * Math.PI * 2 + t * 0.025;
      const radius = 1.6 + Math.sin(t * 0.18 + i * 1.5) * 0.25;
      posArray[i * 3] = Math.cos(baseAngle) * radius;
      posArray[i * 3 + 1] = Math.sin(baseAngle) * radius * 0.35 + Math.sin(t * 0.12 + i * 2) * 0.18;
      posArray[i * 3 + 2] = Math.sin(baseAngle * 0.5 + i) * 0.4;
    }

    posAttr.needsUpdate = true;

    // Update connection lines
    if (lineRef.current) {
      const linePos = lineGeo.attributes.position.array as Float32Array;
      let lineIdx = 0;
      const connectDist = 2.0;

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = posArray[i * 3] - posArray[j * 3];
          const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
          const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectDist && lineIdx < linePos.length - 6) {
            linePos[lineIdx++] = posArray[i * 3];
            linePos[lineIdx++] = posArray[i * 3 + 1];
            linePos[lineIdx++] = posArray[i * 3 + 2];
            linePos[lineIdx++] = posArray[j * 3];
            linePos[lineIdx++] = posArray[j * 3 + 1];
            linePos[lineIdx++] = posArray[j * 3 + 2];
          }
        }
      }

      for (let i = lineIdx; i < linePos.length; i++) linePos[i] = 0;
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, lineIdx / 3);
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={particleRef} geometry={particleGeo}>
        <pointsMaterial
          size={0.18}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={lineRef} geometry={lineGeo}>
        <lineBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

export function ConstellationScene({ isVisible }: { isVisible: boolean }) {
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
      camera={{ position: [0, 0, 6.5], fov: 48 }}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <Constellation primaryColor={color} />
    </Canvas>
  );
}
