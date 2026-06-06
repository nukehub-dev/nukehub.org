import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';

function toThreeColor(hex: string) {
  return new THREE.Color(hex);
}

function DataLattice({ primaryColor }: { primaryColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const primary = useMemo(() => toThreeColor(primaryColor), [primaryColor]);

  const { gridPositions, linePositions } = useMemo(() => {
    const cols = 7;
    const rows = 4;
    const spacing = 1.1;

    const points: THREE.Vector3[] = [];
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        points.push(
          new THREE.Vector3(
            (x - (cols - 1) / 2) * spacing,
            (y - (rows - 1) / 2) * spacing * 0.6,
            (Math.random() - 0.5) * 0.3
          )
        );
      }
    }

    const lines: THREE.Vector3[] = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = points[i].distanceTo(points[j]);
        if (dist < spacing * 1.5) {
          lines.push(points[i].clone(), points[j].clone());
        }
      }
    }

    return { gridPositions: points, linePositions: lines };
  }, []);

  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(linePositions.length * 3);
    linePositions.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [linePositions]);

  const pointsGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(gridPositions.length * 3);
    gridPositions.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [gridPositions]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.015;
    groupRef.current.rotation.x = Math.sin(t * 0.008) * 0.06;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <points geometry={pointsGeo}>
        <pointsMaterial
          size={0.12}
          color={primary}
          transparent
          opacity={0.5}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export function LatticeScene({ isVisible }: { isVisible: boolean }) {
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
      camera={{ position: [0, 0, 7], fov: 50 }}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <DataLattice primaryColor={color} />
    </Canvas>
  );
}
