import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAccentColor } from './useAccentColor';

/* -------------------------------------------------------------------------- */
/*  Procedural cladding texture — subtle axial ridges for zircaloy realism    */
/* -------------------------------------------------------------------------- */

let _claddingTexture: THREE.CanvasTexture | null = null;
function getCladdingTexture(): THREE.CanvasTexture {
  if (_claddingTexture) return _claddingTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 1024);

  for (let x = 0; x < 128; x += 2) {
    const variation = Math.sin(x * 0.35) * 28 + (Math.random() - 0.5) * 14;
    const v = Math.round(128 + variation);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 2, 1024);
  }

  for (let y = 0; y < 1024; y += 48) {
    ctx.fillStyle = 'rgba(100,100,100,0.4)';
    ctx.fillRect(0, y, 128, 1);
  }

  _claddingTexture = new THREE.CanvasTexture(canvas);
  _claddingTexture.wrapS = THREE.RepeatWrapping;
  _claddingTexture.wrapT = THREE.RepeatWrapping;
  _claddingTexture.repeat.set(2, 3);
  _claddingTexture.anisotropy = 4;
  return _claddingTexture;
}

/* -------------------------------------------------------------------------- */
/*  Hex grid utilities                                                        */
/* -------------------------------------------------------------------------- */

const SPACING = 0.22;
const SQRT3_2 = Math.sqrt(3) / 2;

interface HexCell {
  idx: number;
  q: number;
  r: number;
  x: number;
  z: number;
  dist: number;
}

function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
}

function generateHexGrid(radius: number): HexCell[] {
  const cells: HexCell[] = [];
  let idx = 0;
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const x = SPACING * (q + r / 2);
      const z = SPACING * SQRT3_2 * r;
      const dist = hexDistance(q, r, 0, 0);
      cells.push({ idx, q, r, x, z, dist });
      idx++;
    }
  }
  return cells;
}

function buildAdjacencies(cells: HexCell[]): number[][] {
  const adj: number[][] = cells.map(() => []);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (hexDistance(cells[i].q, cells[i].r, cells[j].q, cells[j].r) === 1) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  return adj;
}

/* -------------------------------------------------------------------------- */
/*  Fuel Rod — long, thin zircaloy tube                                       */
/* -------------------------------------------------------------------------- */

function FuelRod({
  position,
  height,
  rodColor,
}: {
  position: [number, number, number];
  height: number;
  rodColor: string;
}) {
  const radius = 0.065;
  const groupRef = useRef<THREE.Group>(null);
  const tex = useMemo(() => getCladdingTexture(), []);

  return (
    <group ref={groupRef} position={position}>
      {/* Rod body — zircaloy cladding with texture */}
      <mesh position={[0, height / 2 + 0.02, 0]}>
        <cylinderGeometry args={[radius, radius, height, 12]} />
        <meshStandardMaterial
          color={rodColor}
          roughness={0.35}
          metalness={0.9}
          bumpMap={tex}
          bumpScale={0.004}
        />
      </mesh>

      {/* Bottom end plug */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[radius * 0.95, radius * 1.08, 0.06, 8]} />
        <meshStandardMaterial
          color="#9a9aa0"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Top end plug */}
      <mesh position={[0, height + 0.03, 0]}>
        <cylinderGeometry args={[radius * 1.08, radius * 0.95, 0.06, 8]} />
        <meshStandardMaterial
          color="#9a9aa0"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Guide Thimble — hollow tube for control rod insertion                     */
/* -------------------------------------------------------------------------- */

function GuideThimble({
  position,
  height,
}: {
  position: [number, number, number];
  height: number;
}) {
  const radius = 0.09;
  return (
    <group position={position}>
      {/* Thin guide tube */}
      <mesh position={[0, height / 2 + 0.04, 0]}>
        <cylinderGeometry args={[radius, radius, height, 12]} />
        <meshStandardMaterial
          color="#787880"
          roughness={0.35}
          metalness={0.85}
          transparent
          opacity={0.35}
        />
      </mesh>
      {/* Top rim ring */}
      <mesh position={[0, height + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.85, radius * 1.15, 12]} />
        <meshStandardMaterial
          color="#888890"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Control Rod Spider — top hub with rods that slide into guide thimbles     */
/* -------------------------------------------------------------------------- */

function ControlRodSpider({
  guidePositions,
  rodHeight,
  baseY,
  insertionRef,
}: {
  guidePositions: [number, number][];
  rodHeight: number;
  baseY: number;
  insertionRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Animate the whole spider up and down (withdrawal / insertion)
  // insertionRef: 0 = fully inserted (rods deep, reaction suppressed)
  //                1 = fully withdrawn (rods up, reaction active)
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const insertion = (Math.sin(t * 0.35) + 1) / 2; // 0 to 1, ~9s half-cycle
    insertionRef.current = insertion;
    const offset = insertion * 1.8; // travel 1.8 units for clearer motion
    groupRef.current.position.y = baseY + offset;
  });

  const avgX = useMemo(
    () => guidePositions.reduce((s, p) => s + p[0], 0) / guidePositions.length,
    [guidePositions]
  );
  const avgZ = useMemo(
    () => guidePositions.reduce((s, p) => s + p[1], 0) / guidePositions.length,
    [guidePositions]
  );

  // Radial arms from center hub to each control rod
  const arms = useMemo(() => {
    return guidePositions.map(([x, z]) => {
      const dx = x - avgX;
      const dz = z - avgZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      return { dx, dz, dist, angle };
    });
  }, [guidePositions, avgX, avgZ]);

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      {/* Central vertical drive shaft */}
      <mesh position={[avgX, 0.35, avgZ]}>
        <cylinderGeometry args={[0.045, 0.05, 0.7, 8]} />
        <meshStandardMaterial color="#555560" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Central hub disc */}
      <mesh position={[avgX, 0.08, avgZ]}>
        <cylinderGeometry args={[0.12, 0.14, 0.06, 8]} />
        <meshStandardMaterial color="#4a4a50" roughness={0.35} metalness={0.9} />
      </mesh>

      {/* Radial arms — one to each control rod, sloping down like umbrella ribs */}
      {arms.map((arm, i) => {
        const hubOffset = 0.06;
        const start = new THREE.Vector3(
          avgX + (arm.dx / arm.dist) * hubOffset,
          0.15,
          avgZ + (arm.dz / arm.dist) * hubOffset
        );
        const end = new THREE.Vector3(
          avgX + arm.dx,
          0.13,
          avgZ + arm.dz
        );
        const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const armLen = start.distanceTo(end);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        return (
          <mesh key={i} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.02, 0.018, armLen, 6]} />
            <meshStandardMaterial color="#3a3a42" roughness={0.35} metalness={0.85} />
          </mesh>
        );
      })}

      {/* Rod caps — wider discs where arms terminate */}
      {guidePositions.map(([x, z], i) => (
        <mesh key={`conn-${i}`} position={[x, 0.12, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
          <meshStandardMaterial color="#4a4a50" roughness={0.35} metalness={0.85} />
        </mesh>
      ))}

      {/* Control rods hanging down from caps */}
      {guidePositions.map(([x, z], i) => (
        <group key={i} position={[x, 0.11, z]}>
          {/* Rod body — neutron absorber (Ag-In-Cd), darker */}
          <mesh position={[0, -rodHeight / 2, 0]}>
            <cylinderGeometry args={[0.042, 0.042, rodHeight, 8]} />
            <meshStandardMaterial
              color="#2e2e34"
              roughness={0.45}
              metalness={0.55}
            />
          </mesh>
          {/* Rod tip — tapered */}
          <mesh position={[0, -rodHeight - 0.02, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.04, 8]} />
            <meshStandardMaterial color="#3a3a40" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Guide Tubes — thin vertical posts at hexagonal frame corners              */
/* -------------------------------------------------------------------------- */

function GuideTubes({ radius, topY, bottomY }: {
  radius: number;
  topY: number;
  bottomY: number;
}) {
  const posts = useMemo(() => {
    const r = radius + 0.34;
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
      };
    });
  }, [radius]);

  const height = topY - bottomY;

  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, bottomY + height / 2, p.z]}>
          <cylinderGeometry args={[0.02, 0.02, height, 6]} />
          <meshStandardMaterial
            color="#888890"
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lower Nozzle Plate — perforated hex disc rods sit on                      */
/* -------------------------------------------------------------------------- */

function LowerNozzlePlate({ cells, radius, guideIndices }: { cells: HexCell[]; radius: number; guideIndices: number[] }) {
  const geometry = useMemo(() => {
    const outerR = radius + 0.6;
    const shape = new THREE.Shape();
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * outerR;
      const z = Math.sin(angle) * outerR;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }

    // Holes for each rod / guide thimble — sized to not overlap, forming clean circles
    // Note: use -cell.z because rotateX(-PI/2) mirrors the Z axis
    // Holes trace clockwise (Three.js convention: outer shape CCW, holes CW)
    cells.forEach((cell) => {
      const hole = new THREE.Path();
      const hr = guideIndices.includes(cell.idx) ? 0.105 : 0.085;
      for (let i = 16; i >= 0; i--) {
        const angle = (i / 16) * Math.PI * 2;
        const x = cell.x + Math.cos(angle) * hr;
        const z = -cell.z + Math.sin(angle) * hr;
        if (i === 16) hole.moveTo(x, z);
        else hole.lineTo(x, z);
      }
      shape.holes.push(hole);
    });

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: false,
      curveSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [cells, radius, guideIndices]);

  return (
    <mesh geometry={geometry} position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#909098"
        roughness={0.45}
        metalness={0.8}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Upper Nozzle Plate — perforated hex disc with lifting bail                */
/* -------------------------------------------------------------------------- */

function UpperNozzlePlate({ cells, radius, y, guideIndices }: {
  cells: HexCell[];
  radius: number;
  y: number;
  guideIndices: number[];
}) {
  const plateGeo = useMemo(() => {
    const outerR = radius + 0.6;
    const shape = new THREE.Shape();
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * outerR;
      const z = Math.sin(angle) * outerR;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }

    // Holes for each rod / guide thimble — sized to not overlap, forming clean circles
    // Note: use -cell.z because rotateX(-PI/2) mirrors the Z axis
    // All holes uniform size to prevent center hole overlapping neighbors
    // Holes trace clockwise (Three.js convention: outer shape CCW, holes CW)
    cells.forEach((cell) => {
      const hole = new THREE.Path();
      const hr = guideIndices.includes(cell.idx) ? 0.105 : 0.085;
      for (let i = 16; i >= 0; i--) {
        const angle = (i / 16) * Math.PI * 2;
        const x = cell.x + Math.cos(angle) * hr;
        const z = -cell.z + Math.sin(angle) * hr;
        if (i === 16) hole.moveTo(x, z);
        else hole.lineTo(x, z);
      }
      shape.holes.push(hole);
    });

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
      curveSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y, 0);
    return geo;
  }, [cells, radius, y, guideIndices]);

  return (
    <group>
      {/* Plate */}
      <mesh geometry={plateGeo}>
        <meshStandardMaterial
          color="#9a9aa0"
          roughness={0.4}
          metalness={0.85}
        />
      </mesh>
      {/* Lifting bail removed to prevent stray geometry on plate */}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Spacer Grid — thin Inconel honeycomb structure that holds rods in place   */
/* -------------------------------------------------------------------------- */

function SpacerGrid({ cells, radius, y, guideIndices }: {
  cells: HexCell[];
  radius: number;
  y: number;
  guideIndices: number[];
}) {
  const geometry = useMemo(() => {
    const outerR = radius + 0.55;
    const shape = new THREE.Shape();
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * outerR;
      const z = Math.sin(angle) * outerR;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }

    cells.forEach((cell) => {
      const hole = new THREE.Path();
      const hr = guideIndices.includes(cell.idx) ? 0.108 : 0.088;
      for (let i = 16; i >= 0; i--) {
        const angle = (i / 16) * Math.PI * 2;
        const x = cell.x + Math.cos(angle) * hr;
        const z = -cell.z + Math.sin(angle) * hr;
        if (i === 16) hole.moveTo(x, z);
        else hole.lineTo(x, z);
      }
      shape.holes.push(hole);
    });

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.025,
      bevelEnabled: false,
      curveSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y, 0);
    return geo;
  }, [cells, radius, y, guideIndices]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#6a6a70"
        roughness={0.5}
        metalness={0.85}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Heat Shimmer — cool blue-white particles rising above hot rods            */
/* -------------------------------------------------------------------------- */

function HeatShimmer({ hotPositions, count }: {
  hotPositions: [number, number, number][];
  count: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const base = hotPositions[Math.floor(Math.random() * hotPositions.length)];
      return {
        baseX: base[0],
        baseZ: base[2],
        offsetX: (Math.random() - 0.5) * 0.4,
        offsetZ: (Math.random() - 0.5) * 0.4,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        maxAge: 1.5 + Math.random() * 1.5,
      };
    });
  }, [count, hotPositions]);

  const ages = useRef<number[]>(particles.map(() => Math.random() * 2));

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    particles.forEach((p, i) => {
      ages.current[i] += delta;
      if (ages.current[i] > p.maxAge) ages.current[i] = 0;

      const age = ages.current[i];
      const life = age / p.maxAge;

      const y = 1.5 + age * p.speed;
      const x = p.baseX + p.offsetX + Math.sin(age * 3 + p.phase) * 0.12;
      const z = p.baseZ + p.offsetZ + Math.cos(age * 2.5 + p.phase) * 0.12;
      const scale = (1 - life) * 0.05;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(Math.max(0, scale));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color="#4a4540"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sharp hexagonal ring — flat washer with exact hexagonal edges             */
/* -------------------------------------------------------------------------- */

function HexRing({ radius, y }: { radius: number; y: number }) {
  const geometry = useMemo(() => {
    const outerR = radius + 0.58;
    const innerR = radius + 0.52;
    const shape = new THREE.Shape();

    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * outerR;
      const z = Math.sin(angle) * outerR;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }

    const hole = new THREE.Path();
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * innerR;
      const z = Math.sin(angle) * innerR;
      if (i === 0) hole.moveTo(x, z);
      else hole.lineTo(x, z);
    }
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: false,
      curveSegments: 1,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y, 0);
    return geo;
  }, [radius, y]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#888890"
        roughness={0.35}
        metalness={0.9}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grid Spacer — thin hexagonal band around the assembly (unused for now)    */
/* -------------------------------------------------------------------------- */

function GridSpacer({ radius }: { radius: number }) {
  return <HexRing radius={radius} y={1.6} />;
}

/* -------------------------------------------------------------------------- */
/*  In-core Instrument Thimbles — extra-thin detector guide tubes             */
/* -------------------------------------------------------------------------- */

function InstrumentThimbles({
  cells,
  guideIndices,
  maxRodHeight,
}: {
  cells: HexCell[];
  guideIndices: number[];
  maxRodHeight: number;
}) {
  const thimblePositions = useMemo(() => {
    const outer = cells.filter((c) => c.dist >= 3 && !guideIndices.includes(c.idx));
    const picks = [outer[2], outer[8], outer[15]].filter(Boolean);
    return picks.map((c) => [c.x, c.z] as [number, number]);
  }, [cells, guideIndices]);

  return (
    <group>
      {thimblePositions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Shortened so bottom doesn't poke below lower plate */}
          <mesh position={[0, maxRodHeight * 0.48 + 0.04, 0]}>
            <cylinderGeometry args={[0.035, 0.035, maxRodHeight * 0.92, 8]} />
            <meshStandardMaterial
              color="#9a9aa0"
              roughness={0.35}
              metalness={0.88}
              /* no emissive */
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Core Barrel Reflection — faint pressure vessel wall in the background     */
/* -------------------------------------------------------------------------- */

function CoreBarrel() {
  return (
    <group>
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[4.5, 4.5, 5, 32, 1, true]} />
        <meshStandardMaterial
          color="#2a2a30"
          roughness={0.85}
          metalness={0.4}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 4.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.4, 4.6, 32]} />
        <meshBasicMaterial
          color="#2a2a30"
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.4, 4.6, 32]} />
        <meshBasicMaterial
          color="#2a2a30"
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Neutron Particle                                                          */
/* -------------------------------------------------------------------------- */

interface NeutronProps {
  cells: HexCell[];
  adj: number[][];
  startIdx: number;
  accent: string;
  speed: number;
}

function Neutron({ cells, adj, startIdx, accent, speed }: NeutronProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const stateRef = useRef({
    from: startIdx,
    to: adj[startIdx][Math.floor(Math.random() * adj[startIdx].length)],
    progress: 0,
  });

  const fromPos = useMemo(() => new THREE.Vector3(cells[startIdx].x, 0, cells[startIdx].z), [cells, startIdx]);
  const toPos = useMemo(() => new THREE.Vector3(
    cells[stateRef.current.to].x,
    0,
    cells[stateRef.current.to].z
  ), [cells]);

  const currentFrom = useRef(fromPos.clone());
  const currentTo = useRef(toPos.clone());

  const maxTrail = 25;
  const trailLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxTrail * 3), 3));
    const mat = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return new THREE.Line(geo, mat);
  }, [accent]);
  const trailGeo = trailLine.geometry as THREE.BufferGeometry;
  const trailPoints = useRef<THREE.Vector3[]>([]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    stateRef.current.progress += delta * speed * 1.8;

    if (stateRef.current.progress >= 1) {
      const neighbors = adj[stateRef.current.to];
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      currentFrom.current.set(cells[stateRef.current.to].x, 0, cells[stateRef.current.to].z);
      currentTo.current.set(cells[next].x, 0, cells[next].z);
      stateRef.current.from = stateRef.current.to;
      stateRef.current.to = next;
      stateRef.current.progress = 0;
      trailPoints.current = [];
      return;
    }

    const p = stateRef.current.progress;
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

    const pos = new THREE.Vector3().lerpVectors(currentFrom.current, currentTo.current, eased);
    pos.y += Math.sin(eased * Math.PI) * 0.45;

    meshRef.current.position.copy(pos);

    trailPoints.current.push(pos.clone());
    if (trailPoints.current.length > maxTrail) trailPoints.current.shift();

    const arr = trailGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < maxTrail; i++) {
      const tp = trailPoints.current[i];
      if (tp) {
        arr[i * 3] = tp.x;
        arr[i * 3 + 1] = tp.y;
        arr[i * 3 + 2] = tp.z;
      } else {
        arr[i * 3] = pos.x;
        arr[i * 3 + 1] = pos.y;
        arr[i * 3 + 2] = pos.z;
      }
    }
    trailGeo.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <primitive object={trailLine} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Neutron Flux                                                              */
/* -------------------------------------------------------------------------- */

function NeutronFlux({
  cells,
  adj,
  count,
  accent,
}: {
  cells: HexCell[];
  adj: number[][];
  count: number;
  accent: string;
}) {
  const neutrons = useMemo(() => {
    const centerIdx = cells.findIndex((c) => c.dist === 0);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      idx: centerIdx >= 0 && i === 0 ? centerIdx : Math.floor(Math.random() * cells.length),
    }));
  }, [cells, count]);

  return (
    <group>
      {neutrons.map((n) => (
        <Neutron
          key={n.id}
          cells={cells}
          adj={adj}
          startIdx={n.idx}
          accent={accent}
          speed={0.3 + Math.random() * 0.2}
        />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Fission Sparks — occasional bright bursts from center (ref-based, no setState) */
/* -------------------------------------------------------------------------- */

interface SparkData {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  born: number;
  pos: THREE.Vector3;
}

function FissionSparks({ accent }: { accent: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const sparksRef = useRef<SparkData[]>([]);
  const geoRef = useRef<THREE.SphereGeometry | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);

  // Shared geometry & material to avoid recreating per spark
  useMemo(() => {
    geoRef.current = new THREE.SphereGeometry(1, 6, 6);
    matRef.current = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
  }, []);

  useFrame((state) => {
    const group = groupRef.current;
    const geo = geoRef.current;
    const mat = matRef.current;
    if (!group || !geo || !mat) return;

    const t = state.clock.elapsedTime;

    // Spawn new spark
    if (Math.random() < 0.015) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.5;
      const pos = new THREE.Vector3(
        Math.cos(angle) * r,
        0.8 + Math.random() * 0.8,
        Math.sin(angle) * r
      );

      const mesh = new THREE.Mesh(geo, mat);
      const light = new THREE.PointLight(accent, 2, 2, 2);
      mesh.add(light);
      group.add(mesh);

      sparksRef.current.push({ mesh, light, born: t, pos });
    }

    // Update alive sparks, remove expired
    const alive: SparkData[] = [];
    for (const spark of sparksRef.current) {
      const age = t - spark.born;
      if (age >= 0.6) {
        group.remove(spark.mesh);
        continue;
      }

      const life = 1 - age / 0.6;
      const scale = Math.sin(life * Math.PI) * 0.12;
      spark.mesh.scale.setScalar(Math.max(0, scale));
      spark.mesh.position.set(spark.pos.x, spark.pos.y + age * 0.3, spark.pos.z);
      spark.light.intensity = life * 2;

      alive.push(spark);
    }
    sparksRef.current = alive;
  });

  return <group ref={groupRef} />;
}

/* -------------------------------------------------------------------------- */
/*  Coolant Flow — subtle rising particles between rods                       */
/* -------------------------------------------------------------------------- */

function CoolantFlow({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.2 + Math.random() * 1.2,
      speed: 0.4 + Math.random() * 0.6,
      offset: Math.random() * 2,
      size: 0.006 + Math.random() * 0.01,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      const y = ((t * p.speed + p.offset) % 4.0) - 0.2;
      dummy.position.set(
        Math.cos(p.angle) * p.radius,
        y,
        Math.sin(p.angle) * p.radius
      );
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#4a5560"
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Ambient floating particles                                                */
/* -------------------------------------------------------------------------- */

function AmbientParticles({ count, accent }: { count: number; accent: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: 1.5 + (Math.random() - 0.5) * 5,
      y: Math.random() * 4 - 0.3,
      z: (Math.random() - 0.5) * 5,
      speed: 0.03 + Math.random() * 0.06,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.6,
        p.y + Math.sin(t * p.speed * 0.7 + p.phase) * 0.4,
        p.z + Math.cos(t * p.speed + p.phase) * 0.6
      );
      const s = 0.02 + Math.sin(t * 0.8 + p.phase) * 0.01;
      dummy.scale.setScalar(Math.max(0.008, s));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={accent}
        transparent
        opacity={0.18}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reaction Point Light — dims when control rods insert                      */
/* -------------------------------------------------------------------------- */

function ReactionPointLight({ insertionRef, accent }: { insertionRef: React.MutableRefObject<number>; accent: string }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!lightRef.current) return;
    const insertion = insertionRef.current;
    lightRef.current.intensity = 0.2 + insertion * 0.5;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 1.8, 0]}
      color={accent}
      intensity={0.8}
      distance={5}
      decay={2}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Floor ring & core glow                                                    */
/* -------------------------------------------------------------------------- */

function FloorRing({ radius, accent }: { radius: number; accent: string }) {
  return (
    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.85, radius * 1.1, 64]} />
      <meshBasicMaterial
        color={accent}
        transparent
        opacity={0.015}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function CoreGlow({ accent }: { accent: string }) {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.0, 32]} />
      <meshBasicMaterial
        color={accent}
        transparent
        opacity={0.02}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Water Surface — visible coolant level with subtle ripple                  */
/* -------------------------------------------------------------------------- */

function WaterSurface({ radius, y, accent }: { radius: number; y: number; accent: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!matRef.current || !meshRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.18 + Math.sin(t * 0.6) * 0.04;
    meshRef.current.position.y = y + Math.sin(t * 0.4) * 0.006;
  });

  return (
    <mesh ref={meshRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial
        ref={matRef}
        color="#4a5560"
        roughness={0.05}
        metalness={0.15}
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Coolant Water Volume — translucent blue cylinder surrounding assembly     */
/* -------------------------------------------------------------------------- */

function CoolantWater({ maxRodHeight, assemblyRadius, accent }: { maxRodHeight: number; assemblyRadius: number; accent: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.035 + Math.sin(t * 0.4) * 0.01;
  });

  const waterTop = maxRodHeight + 0.55;
  const waterBottom = -0.3;
  const waterCenterY = (waterTop + waterBottom) / 2;
  const waterHeight = waterTop - waterBottom;

  return (
    <group>
      <mesh ref={meshRef} position={[0, waterCenterY, 0]}>
        <cylinderGeometry args={[assemblyRadius + 0.6, assemblyRadius + 0.6, waterHeight, 48]} />
        <meshStandardMaterial
          ref={matRef}
          color={accent}
          roughness={0.0}
          metalness={0.0}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cherenkov Radiation Glow — ambient blue glow in water between rods        */
/* -------------------------------------------------------------------------- */

function CherenkovGlow({ maxRodHeight, cells, insertionRef, accent }: { maxRodHeight: number; cells: HexCell[]; insertionRef: React.MutableRefObject<number>; accent: string }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const centerGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const insertion = insertionRef.current; // 0 = inserted (dim), 1 = withdrawn (bright)
    if (lightRef.current) {
      lightRef.current.intensity = 0.15 + insertion * 0.5;
    }
    if (centerGlowRef.current) {
      centerGlowRef.current.opacity = 0.015 + insertion * 0.035;
    }
    if (ringRef.current) {
      ringRef.current.opacity = 0.015 + insertion * 0.03;
    }
  });

  return (
    <group>
      {/* Central glow volume */}
      <mesh position={[0, maxRodHeight * 0.5, 0]}>
        <cylinderGeometry args={[0.7, 0.7, maxRodHeight * 0.8, 24, 1, true]} />
        <meshBasicMaterial
          ref={centerGlowRef}
          color={accent}
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Scattered glow volumes around inner rods */}
      {cells.filter((c) => c.dist === 1 || c.dist === 2).slice(0, 6).map((cell, i) => (
        <mesh key={i} position={[cell.x, maxRodHeight * 0.5, cell.z]}>
          <cylinderGeometry args={[0.25, 0.25, maxRodHeight * 0.5, 16, 1, true]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.015}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Cherenkov point light — cool blue, dims when rods insert */}
      <pointLight
        ref={lightRef}
        position={[0, maxRodHeight * 0.5, 0]}
        color={accent}
        intensity={0.8}
        distance={3}
        decay={2}
      />

      {/* Faint blue glow on rod surfaces (inner ring) */}
      <mesh position={[0, maxRodHeight * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 1.4, 48]} />
        <meshBasicMaterial
          ref={ringRef}
          color={accent}
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Coolant Bubbles — small white spheres rising through water                */
/* -------------------------------------------------------------------------- */

function CoolantBubbles({ count, assemblyRadius, maxRodHeight }: { count: number; assemblyRadius: number; maxRodHeight: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * (assemblyRadius + 0.5) * 2,
      z: (Math.random() - 0.5) * (assemblyRadius + 0.5) * 2,
      speed: 0.2 + Math.random() * 0.4,
      offset: Math.random() * 3,
      size: 0.006 + Math.random() * 0.014,
      wobble: Math.random() * Math.PI * 2,
    }));
  }, [count, assemblyRadius]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      const y = ((t * p.speed + p.offset) % (maxRodHeight + 0.5)) - 0.3;
      const x = p.x + Math.sin(t * 1.5 + p.wobble) * 0.08;
      const z = p.z + Math.cos(t * 1.2 + p.wobble) * 0.08;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#4a5560"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main exported component                                                   */
/* -------------------------------------------------------------------------- */

interface ReactorLatticeProps {
  mobile?: boolean;
  reducedMotion?: boolean;
}

export function ReactorLattice({ mobile, reducedMotion }: ReactorLatticeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const accent = useAccentColor();
  const insertionRef = useRef(0.5); // 0 = inserted (dim), 1 = withdrawn (bright)

  const cells = useMemo(() => generateHexGrid(4), []);
  const adj = useMemo(() => buildAdjacencies(cells), [cells]);
  const centerIdx = useMemo(() => cells.findIndex((c) => c.dist === 0), [cells]);

  // Pick 6 outer cells as guide thimbles (evenly spaced around perimeter)
  const guideThimbleIndices = useMemo(() => {
    const outer = cells
      .filter((c) => c.dist === 4)
      .sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x))
      .map((c) => c.idx);
    return [outer[0], outer[4], outer[8], outer[12], outer[16], outer[20]].filter((i) => i !== undefined);
  }, [cells]);

  const assemblyRadius = useMemo(
    () => Math.max(...cells.map((c) => Math.sqrt(c.x * c.x + c.z * c.z))) + SPACING * 0.3,
    [cells]
  );

  // Rod heights — uniform so all rods reach the top plate cleanly
  const rodHeights = useMemo(() => {
    return cells.map(() => 3.2);
  }, []);

  // Rod bowing — removed to ensure perfect alignment with nozzle plates
  const rodBows = useMemo(() => {
    return cells.map(() => [0, 0] as [number, number]);
  }, [cells]);

  // Fresh zircaloy color gradient: subtle variation, all silver/grey
  const rodColors = useMemo(() => {
    return cells.map((cell) => {
      if (guideThimbleIndices.includes(cell.idx)) return '#a0a0a8'; // guide thimbles
      if (cell.dist <= 2) return '#b8b8c0'; // inner rings
      return '#b0b0b8'; // outer ring
    });
  }, [cells, guideThimbleIndices]);

  const maxRodHeight = useMemo(() => Math.max(...rodHeights), [rodHeights]);

  // Positions of hot rods for heat shimmer
  const hotPositions = useMemo(() => {
    return cells
      .filter((c) => c.dist <= 2)
      .map((c) => [c.x, 0, c.z] as [number, number, number]);
  }, [cells]);

  const neutronCount = mobile ? 2 : 3;
  const ambientCount = mobile ? 8 : 14;
  const coolantCount = mobile ? 10 : 20;
  const shimmerCount = mobile ? 8 : 16;

  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef}>
      {/* Lighting */}
      {/* Key light — strong warm white from front-above */}
      <directionalLight position={[4, 6, 5]} intensity={2.5} color="#e8ecf0" castShadow={false} />
      {/* Rim light — cool blue from behind to define edges */}
      <directionalLight position={[-3, 2, -6]} intensity={1.2} color="#aabbdd" />
      {/* Fill — soft warm from opposite side */}
      <directionalLight position={[-5, 4, 3]} intensity={0.6} color="#ccd0d8" />
      {/* Under fill — prevents bottom from going pure black */}
      <directionalLight position={[2, -3, 2]} intensity={0.3} color="#556070" />
      <ambientLight intensity={0.15} />
      <ReactionPointLight insertionRef={insertionRef} accent={accent} />

      {/* Floor elements */}
      <FloorRing radius={assemblyRadius} accent={accent} />
      <CoreGlow accent={accent} />

      {/* Lower nozzle plate — rods rest on this */}
      <LowerNozzlePlate cells={cells} radius={assemblyRadius} guideIndices={guideThimbleIndices} />

      {/* Top & bottom hexagonal frame rings */}
      <HexRing radius={assemblyRadius} y={maxRodHeight + 0.1} />
      <HexRing radius={assemblyRadius} y={0} />

      {/* Upper nozzle plate with lifting bail */}
      <UpperNozzlePlate cells={cells} radius={assemblyRadius} y={maxRodHeight + 0.02} guideIndices={guideThimbleIndices} />

      {/* Spacer grids — Inconel honeycomb structures that hold rods in place */}
      {[0.55, 1.25, 1.95, 2.65].map((gy, i) => (
        <SpacerGrid
          key={`grid-${i}`}
          cells={cells}
          radius={assemblyRadius}
          y={gy}
          guideIndices={guideThimbleIndices}
        />
      ))}

      {/* Water surface — visible coolant meniscus at the top of the water column */}
      <WaterSurface radius={assemblyRadius + 0.6} y={maxRodHeight + 0.55} accent={accent} />

      {/* In-core instrument thimbles */}
      <InstrumentThimbles
        cells={cells}
        guideIndices={guideThimbleIndices}
        maxRodHeight={maxRodHeight}
      />

      {/* Core barrel */}
      <CoreBarrel />

      {/* Guide tubes connecting the frame rings — no legs, start at bottom plate */}
      <GuideTubes
        radius={assemblyRadius}
        topY={maxRodHeight + 0.1}
        bottomY={0}
      />

      {/* Fuel rods and guide thimbles */}
      {cells.map((cell, i) => {
        const isGuide = guideThimbleIndices.includes(cell.idx);
        // Center cell is left empty for the spider hub drive shaft
        if (cell.idx === centerIdx) {
          return (
            <group key={cell.idx} position={[cell.x, 0, cell.z]}>
              {/* Thin center sleeve — hollow tube for spider shaft, not a fuel rod */}
              <mesh position={[0, maxRodHeight * 0.5 + 0.04, 0]}>
                <cylinderGeometry args={[0.055, 0.055, maxRodHeight, 8]} />
                <meshStandardMaterial
                  color="#888890"
                  roughness={0.35}
                  metalness={0.88}
                  transparent
                  opacity={0.25}
                />
              </mesh>
            </group>
          );
        }
        if (isGuide) {
          return (
            <GuideThimble
              key={cell.idx}
              position={[cell.x + rodBows[i][0], 0, cell.z + rodBows[i][1]]}
              height={rodHeights[i]}
            />
          );
        }
        return (
          <FuelRod
            key={cell.idx}
            position={[cell.x + rodBows[i][0], 0, cell.z + rodBows[i][1]]}
            height={rodHeights[i]}
            rodColor={rodColors[i]}
          />
        );
      })}

      {/* Control rod spider assembly — sits above upper plate, drops rods in */}
      <ControlRodSpider
        guidePositions={guideThimbleIndices.map((idx) => {
          const cell = cells.find((c) => c.idx === idx)!;
          return [cell.x, cell.z] as [number, number];
        })}
        rodHeight={3.4}
        baseY={maxRodHeight + 0.55}
        insertionRef={insertionRef}
      />

      {/* Neutron flux */}
      <NeutronFlux cells={cells} adj={adj} count={neutronCount} accent={accent} />

      {/* Coolant flow */}
      <CoolantFlow count={coolantCount} />

      {/* Heat shimmer above hot rods */}
      <HeatShimmer hotPositions={hotPositions} count={shimmerCount} />

      {/* Ambient particles */}
      <AmbientParticles count={ambientCount} accent={accent} />

      {/* Coolant water volume */}
      <CoolantWater maxRodHeight={maxRodHeight} assemblyRadius={assemblyRadius} accent={accent} />

      {/* Cherenkov radiation glow — ambient blue between rods, dims when control rods insert */}
      <CherenkovGlow maxRodHeight={maxRodHeight} cells={cells} insertionRef={insertionRef} accent={accent} />


    </group>
  );
}
