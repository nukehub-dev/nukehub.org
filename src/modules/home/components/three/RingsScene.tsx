import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';

function toThreeColor(hex: string) {
  return new THREE.Color(hex);
}

function OrbitalRings({ primaryColor }: { primaryColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const primary = useMemo(() => toThreeColor(primaryColor), [primaryColor]);

  const rings = useMemo(
    () => [
      { radius: 2.0, speed: 0.015, axis: [0.2, 1, 0.1] as [number, number, number], opacity: 0.45 },
      { radius: 2.9, speed: -0.01, axis: [0.4, 1, 0.05] as [number, number, number], opacity: 0.35 },
      { radius: 3.7, speed: 0.006, axis: [0.1, 1, -0.15] as [number, number, number], opacity: 0.25 },
    ],
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      if (i < rings.length) {
        child.rotation.z = t * rings[i].speed;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={ring.axis}>
          <torusGeometry args={[ring.radius, 0.02, 8, 120]} />
          <meshBasicMaterial
            color={primary}
            transparent
            opacity={ring.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Inner thin ring for detail */}
      <mesh rotation={[0.3, 1, 0]}>
        <torusGeometry args={[1.3, 0.008, 8, 100]} />
        <meshBasicMaterial
          color={primary}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Central glow */}
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial
          color={primary}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function RingsScene({ isVisible }: { isVisible: boolean }) {
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
      camera={{ position: [0, 0.3, 6], fov: 50 }}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <OrbitalRings primaryColor={color} />
    </Canvas>
  );
}
