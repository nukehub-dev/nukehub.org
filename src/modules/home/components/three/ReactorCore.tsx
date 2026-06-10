import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getPrimaryColor } from "@lib/themeColors";

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

const sharedHexGeo = createHexGeometry(0.22);

/* ------------------------------------------------------------------ */
// Hex grid — single useFrame updates all cells
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
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { camera } = useThree();

  // Cache mouse world position to avoid raycasting every mousemove
  const cachedMouse = useRef({ x: 999, y: 999 });

  const { cells, cellData } = useMemo(() => {
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
    const rows = 8;
    const cols = 10;

    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const x = col * w + (row % 2) * (w / 2);
        const y = row * h * 0.75;
        const dist = Math.sqrt(x * x + y * y);

        if (dist > 5.5) continue;

        // Cut corners for an octagonal shape
        if (Math.abs(x) > 3.5 && Math.abs(y) > 2.0) continue;

        const distFade = 1 - smoothstep(2, 5, dist);
        const isActive = Math.random() > 0.92;

        const baseOpacity = isActive
          ? (isLight ? 0.06 : 0.03) * distFade
          : (isLight ? 0.03 : 0.015) * distFade;

        items.push({
          position: [x, y, 0],
          distFromCenter: dist,
          baseOpacity: Math.max(baseOpacity, isLight ? 0.015 : 0.008),
          pulsePhase: Math.random() * Math.PI * 2,
          isActive,
        });
      }
    }

    const precomputed = items.map((cell) => ({
      ...cell,
      distFactor: cell.distFromCenter * 1.2,
      distFactorMouse: cell.isActive ? 0.3 : 0.1,
    }));

    return { cells: items, cellData: precomputed };
  }, [isLight]);

  useFrame((state) => {
    // Group rotation + gentle wobble for 3D depth perception
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.004;
      groupRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
      groupRef.current.rotation.y =
        Math.cos(state.clock.elapsedTime * 0.1) * 0.04;
    }

    // Throttle opacity updates: only update every 2nd frame (~30fps)
    const frameCount = Math.round(state.clock.elapsedTime * 60);
    if (frameCount % 2 !== 0) return;

    const t = state.clock.elapsedTime;
    const mx = cachedMouse.current.x;
    const my = cachedMouse.current.y;

    for (let i = 0; i < cellData.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const cell = cellData[i];

      const wave = Math.sin(cell.distFactor - t * 0.6) * 0.5 + 0.5;
      const waveBoost = wave * cell.distFactorMouse;

      const dx = cell.position[0] - mx;
      const dy = cell.position[1] - my;
      const distToMouse = dx * dx + dy * dy; // skip sqrt — compare squared
      const mouseGlow = Math.max(0, 1 - Math.sqrt(distToMouse) * 0.6) * 0.4;

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.4 + cell.pulsePhase);

      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity =
        cell.baseOpacity +
        waveBoost +
        mouseGlow +
        (cell.isActive ? pulse * 0.1 : 0);
    }
  });

  // Throttled mouse position update (every 50ms)
  useEffect(() => {
    let lastUpdate = 0;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastUpdate < 50) return; // 20hz update
      lastUpdate = now;

      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
      vec.unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      cachedMouse.current.x = pos.x;
      cachedMouse.current.y = pos.y;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [camera]);

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

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [camera, mousePos]);

  const cellsArr = cells;
  const matColor = color;

  return (
    <group ref={groupRef}>
      {cellsArr.map((cell, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          position={cell.position}
          geometry={sharedHexGeo}
        >
          <meshBasicMaterial
            color={matColor}
            transparent
            opacity={cell.baseOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
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
      const isLightMode =
        document.documentElement.getAttribute("data-theme") === "light";
      const c = new THREE.Color(getPrimaryColor());
      if (isLightMode) {
        // Light mode: blend toward white so the tint is subtle but still colored
        c.lerp(new THREE.Color(1, 1, 1), 0.55);
      } else {
        // Dark mode: darken for a subtle glow
        c.multiplyScalar(0.25);
      }
      setColor("#" + c.getHexString());
      setIsLight(isLightMode);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-accent", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Canvas
      dpr={[1, 1]}
      camera={{ position: [0, 0, 5], fov: 55 }}
      frameloop={isVisible ? "always" : "never"}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <HexGrid color={color} isLight={isLight} mousePos={mousePos} />
    </Canvas>
  );
}
