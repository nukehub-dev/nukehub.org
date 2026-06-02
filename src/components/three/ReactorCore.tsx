import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';

/* ------------------------------------------------------------------ */
// Hexagon shape geometry
/* ------------------------------------------------------------------ */
function createHexGeometry(radius: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/* ------------------------------------------------------------------ */
// Single hex cell
/* ------------------------------------------------------------------ */
function HexCell({
  position,
  distFromCenter,
  baseOpacity,
  pulsePhase,
  isActive,
  color,
  isLight,
  mousePos,
}: {
  position: [number, number, number];
  distFromCenter: number;
  baseOpacity: number;
  pulsePhase: number;
  isActive: boolean;
  color: string;
  isLight: boolean;
  mousePos: React.MutableRefObject<THREE.Vector2>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Traveling wave
    const wave = Math.sin(distFromCenter * 1.2 - t * 0.6) * 0.5 + 0.5;
    const waveBoost = wave * (isActive ? 0.3 : 0.1);

    // Mouse proximity glow
    const dx = position[0] - mousePos.current.x;
    const dy = position[1] - mousePos.current.y;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);
    const mouseGlow = Math.max(0, 1 - distToMouse * 0.6) * 0.4;

    const pulse = 0.5 + 0.5 * Math.sin(t * 0.4 + pulsePhase);

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = baseOpacity + waveBoost + mouseGlow + (isActive ? pulse * 0.1 : 0);
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={createHexGeometry(0.22)}>
      <meshBasicMaterial
        color={isLight ? '#aaaaaa' : color}
        transparent
        opacity={baseOpacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
// Hex grid
/* ------------------------------------------------------------------ */
function HexGrid({
  color,
  isLight,
  mousePos,
}: {
  color: string;
  isLight: boolean;
  mousePos: React.MutableRefObject<THREE.Vector2>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.004;
    }
  });

  // Convert mouse NDC to world space at z=0 for proximity check
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
      vec.unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      mousePos.current.set(pos.x, pos.y);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [camera, mousePos]);

  const cells = useMemo(() => {
    const items: {
      position: [number, number, number];
      distFromCenter: number;
      baseOpacity: number;
      pulsePhase: number;
      isActive: boolean;
    }[] = [];

    const radius = 0.24;
    const w = radius * Math.sqrt(3);
    const h = radius * 2;
    const rows = 10;
    const cols = 12;

    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const x = col * w + (row % 2) * (w / 2);
        const y = row * h * 0.75;
        const dist = Math.sqrt(x * x + y * y);

        if (dist > 5.5) continue;

        const distFade = 1 - smoothstep(2, 5, dist);
        const isActive = Math.random() > 0.92;

        const baseOpacity = isActive
          ? (isLight ? 0.04 : 0.035) * distFade
          : (isLight ? 0.02 : 0.018) * distFade;

        items.push({
          position: [x, y, 0],
          distFromCenter: dist,
          baseOpacity: Math.max(baseOpacity, isLight ? 0.015 : 0.008),
          pulsePhase: Math.random() * Math.PI * 2,
          isActive,
        });
      }
    }
    return items;
  }, [isLight]);

  return (
    <group ref={groupRef}>
      {cells.map((cell, i) => (
        <HexCell key={i} {...cell} color={color} isLight={isLight} mousePos={mousePos} />
      ))}
    </group>
  );
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
// Exported Scene
/* ------------------------------------------------------------------ */
export function ReactorCoreScene({ isVisible }: { isVisible: boolean }) {
  const [color, setColor] = useState(() => getPrimaryColor());
  const [isLight, setIsLight] = useState(false);
  const mousePos = useRef(new THREE.Vector2(999, 999));

  useEffect(() => {
    const update = () => {
      const c = new THREE.Color(getPrimaryColor());
      c.multiplyScalar(0.25);
      setColor('#' + c.getHexString());
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Canvas
      dpr={[1, 1]}
      camera={{ position: [0, 0, 5], fov: 55 }}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <HexGrid color={color} isLight={isLight} mousePos={mousePos} />
    </Canvas>
  );
}
