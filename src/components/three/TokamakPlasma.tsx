import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
// Smooth D-Curve for Toroidal Field Coils (Flat inner edge)
/* ------------------------------------------------------------------ */
class PiecewiseLinearCurve extends THREE.Curve<THREE.Vector3> {
  private points: THREE.Vector3[];
  private lengths: number[];
  private totalLength: number;

  constructor(points: THREE.Vector3[]) {
    super();
    this.points = points;
    this.lengths = [0];
    for (let i = 1; i < points.length; i++) {
      this.lengths.push(this.lengths[i - 1] + points[i].distanceTo(points[i - 1]));
    }
    this.totalLength = this.lengths[this.lengths.length - 1];
  }

  getPoint(t: number): THREE.Vector3 {
    if (t <= 0) return this.points[0].clone();
    if (t >= 1) return this.points[this.points.length - 1].clone();
    const targetLen = t * this.totalLength;
    let i = 1;
    while (i < this.lengths.length && this.lengths[i] < targetLen) i++;
    const segStart = this.lengths[i - 1];
    const segEnd = this.lengths[i];
    const segLen = segEnd - segStart;
    const segT = segLen < 1e-10 ? 0 : (targetLen - segStart) / segLen;
    return new THREE.Vector3().lerpVectors(this.points[i - 1], this.points[i], segT);
  }
}

function createDPoints(R: number, r: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const innerStraightHeight = R * 1.2;

  for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(0, -innerStraightHeight + (i / 20) * 2 * innerStraightHeight, 0));
  for (let i = 1; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * (Math.PI / 2);
    pts.push(new THREE.Vector3(Math.cos(a) * r, innerStraightHeight + Math.sin(a) * r, 0));
  }
  for (let i = 1; i <= 40; i++) {
    const a = Math.PI / 2 - (i / 40) * Math.PI;
    pts.push(new THREE.Vector3(r + Math.cos(a) * R, Math.sin(a) * innerStraightHeight, 0));
  }
  for (let i = 1; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    pts.push(new THREE.Vector3(Math.cos(a) * r, -innerStraightHeight + Math.sin(a) * r, 0));
  }
  pts.push(pts[0].clone());
  return pts;
}

/* ------------------------------------------------------------------ */
// Shared neutral palette
/* ------------------------------------------------------------------ */
const STEEL = 0xb0b0b8;
const STEEL_DARK = 0x9999a0;
const CONCRETE = 0xc0c0c8;
const COPPER = 0xc4956a;
const GLASS = 0xaabbcc;

/* ------------------------------------------------------------------ */
// Helper: compute world matrix from nested transforms
/* ------------------------------------------------------------------ */
const _parentObj = new THREE.Object3D();
const _childObj = new THREE.Object3D();
_parentObj.add(_childObj);

function setWorldMatrix(
  instancedMesh: THREE.InstancedMesh,
  index: number,
  parentPos: [number, number, number],
  parentRot: [number, number, number],
  localPos: [number, number, number],
  localRot: [number, number, number],
  localScale?: [number, number, number]
) {
  _parentObj.position.set(...parentPos);
  _parentObj.rotation.set(...parentRot);
  _childObj.position.set(...localPos);
  _childObj.rotation.set(...localRot);
  _childObj.scale.set(...(localScale ?? [1, 1, 1]));
  _parentObj.updateMatrixWorld(true);
  instancedMesh.setMatrixAt(index, _childObj.matrixWorld);
}

/* ------------------------------------------------------------------ */
// 1. Central Solenoid — instanced coil segments
/* ------------------------------------------------------------------ */
export function CentralSolenoid({ mobile }: { mobile?: boolean }) {
  const matSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL, metalness: 0.8, roughness: 0.4,
  }), []);
  const matCoil = useMemo(() => new THREE.MeshStandardMaterial({
    color: COPPER, metalness: 0.9, roughness: 0.25,
  }), []);

  const height = 1.9;
  const segments = mobile ? 12 : 24;
  const segmentHeight = height / segments;
  const cylSeg = mobile ? 16 : 32;

  const coilGeo = useMemo(() => new THREE.CylinderGeometry(0.43, 0.43, segmentHeight * 0.75, cylSeg), [segmentHeight, cylSeg]);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!instancedRef.current) return;
    for (let i = 0; i < segments; i++) {
      setWorldMatrix(instancedRef.current, i,
        [0, 0, 0], [0, 0, 0],
        [0, -height / 2 + (i + 0.5) * segmentHeight, 0], [0, 0, 0]
      );
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  }, [segments, segmentHeight, height]);

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, height, cylSeg]} />
        <primitive object={matSteel} attach="material" />
      </mesh>
      <instancedMesh ref={instancedRef} args={[coilGeo, matCoil, segments]} />
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.25, cylSeg]} />
        <primitive object={matSteel} attach="material" />
      </mesh>
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.25, cylSeg]} />
        <primitive object={matSteel} attach="material" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
// 2. Plasma — Electric Blue Fusion core
/* ------------------------------------------------------------------ */
export function Plasma({ mobile, reducedMotion, accent }: { mobile?: boolean; reducedMotion?: boolean; accent?: string }) {
  const ref = useRef<THREE.Group>(null);

  const matOuter = useMemo(() => new THREE.MeshBasicMaterial({
    color: accent || '#3366ff',
    transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }), [accent]);

  const matInner = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true, opacity: 0.9, toneMapped: false,
  }), []);

  const matGlow1 = useMemo(() => new THREE.MeshBasicMaterial({
    color: accent || '#3366ff', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }), [accent]);
  const matGlow2 = useMemo(() => new THREE.MeshBasicMaterial({
    color: accent || '#4488ff', transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }), [accent]);

  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = t * 0.2;
    const pulse = 1 + Math.sin(t * 5.0) * 0.01;
    ref.current.scale.set(pulse, pulse, pulse);
  });

  const seg = mobile ? 16 : 32;
  const tubeSeg = mobile ? 48 : 100;

  return (
    <group ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <mesh scale={[1, 1, 1.3]}>
        <torusGeometry args={[0.75, 0.18, seg, tubeSeg]} />
        <primitive object={matOuter} attach="material" />
      </mesh>
      <mesh scale={[1, 1, 1.3]}>
        <torusGeometry args={[0.75, 0.06, mobile ? 8 : 16, tubeSeg]} />
        <primitive object={matInner} attach="material" />
      </mesh>
      {/* Tight glow — stays inside vacuum vessel */}
      <mesh scale={[1.03, 1.03, 1.32]}>
        <torusGeometry args={[0.75, 0.2, mobile ? 8 : 12, tubeSeg]} />
        <primitive object={matGlow1} attach="material" />
      </mesh>
      <mesh scale={[1.1, 1.1, 1.4]}>
        <torusGeometry args={[0.75, 0.28, mobile ? 6 : 8, tubeSeg]} />
        <primitive object={matGlow2} attach="material" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
// 3. Vacuum Vessel
/* ------------------------------------------------------------------ */
export function VacuumVessel({ mobile }: { mobile?: boolean }) {
  const matGlass = useMemo(() => new THREE.MeshStandardMaterial({
    color: GLASS, metalness: 0.3, roughness: 0.1,
    transparent: true, opacity: 0.15, side: THREE.BackSide, depthWrite: false,
  }), []);

  const seg = mobile ? 32 : 64;

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.3]}>
      <torusGeometry args={[0.75, 0.22, seg, seg]} />
      <primitive object={matGlass} attach="material" />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
// 4. Toroidal Field Coils — instanced
/* ------------------------------------------------------------------ */
export function ToroidalCoils({ mobile }: { mobile?: boolean }) {
  const coilCount = mobile ? 12 : 16;
  const positionR = 0.42;

  const { geo, mat } = useMemo(() => {
    const curveR = 0.88;
    const filletR = 0.05;
    const tubeRadius = 0.05;
    const pts = createDPoints(curveR, filletR);
    const curve = new PiecewiseLinearCurve(pts);
    const geo = new THREE.TubeGeometry(curve, mobile ? 32 : 64, tubeRadius, mobile ? 8 : 16, false);
    const mat = new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.85, roughness: 0.2 });
    return { geo, mat };
  }, [mobile]);

  const instancedRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!instancedRef.current) return;
    for (let i = 0; i < coilCount; i++) {
      const angle = (i / coilCount) * Math.PI * 2;
      setWorldMatrix(instancedRef.current, i,
        [0, 0, 0], [0, 0, 0],
        [Math.cos(angle) * positionR, 0, Math.sin(angle) * positionR],
        [0, -angle, 0],
        [1, 1, 2.5]
      );
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  }, [coilCount, positionR]);

  return <instancedMesh ref={instancedRef} args={[geo, mat, coilCount]} />;
}

/* ------------------------------------------------------------------ */
// 5. Divertor Base Ring
/* ------------------------------------------------------------------ */
export function Divertor({ mobile }: { mobile?: boolean }) {
  const matSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL_DARK, metalness: 0.9, roughness: 0.3,
  }), []);

  const seg = mobile ? 8 : 16;
  const tubeSeg = mobile ? 32 : 64;

  return (
    <group position={[0, -0.25, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.2]}>
        <torusGeometry args={[0.75, 0.12, seg, tubeSeg]} />
        <primitive object={matSteel} attach="material" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
// 6. Poloidal Coils — instanced spokes
/* ------------------------------------------------------------------ */
export function PoloidalCoils({ mobile }: { mobile?: boolean }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL, metalness: 0.5, roughness: 0.4,
  }), []);

  const defs = useMemo(() => [{ y: 1.05, r: 1.52 }, { y: -1.05, r: 1.52 }], []);
  const torusSeg = mobile ? 16 : 32;
  const tubeSeg = mobile ? 32 : 64;
  const cylSeg = mobile ? 16 : 32;

  const spokeCount = 8;
  const totalSpokes = defs.length * spokeCount;

  const geoThin = useMemo(() => new THREE.CylinderGeometry(0.025, 0.025, 0.2, cylSeg), [cylSeg]);
  const geoMed = useMemo(() => new THREE.CylinderGeometry(0.04, 0.04, 0.06, cylSeg), [cylSeg]);
  const geoThick = useMemo(() => new THREE.CylinderGeometry(0.06, 0.06, 0.12, cylSeg), [cylSeg]);

  const refThin = useRef<THREE.InstancedMesh>(null);
  const refMed = useRef<THREE.InstancedMesh>(null);
  const refThick = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const configs = [
      { ref: refThin, pos: 1.58 },
      { ref: refMed, pos: 1.52 },
      { ref: refThick, pos: 1.65 },
    ];

    configs.forEach(({ ref, pos }) => {
      if (!ref.current) return;
      let idx = 0;
      for (const d of defs) {
        for (let j = 0; j < spokeCount; j++) {
          const angle = (j / spokeCount) * Math.PI * 2;
          setWorldMatrix(ref.current, idx++,
            [0, d.y, 0], [0, 0, 0],
            [pos, 0, 0], [0, 0, Math.PI / 2]
          );
        }
      }
      ref.current.instanceMatrix.needsUpdate = true;
    });
  }, [defs, spokeCount]);

  return (
    <group>
      {/* Main Torus Rings */}
      {defs.map((d, i) => (
        <mesh key={i} position={[0, d.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[d.r, 0.05, torusSeg, tubeSeg]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}

      {/* Instanced Spokes */}
      <instancedMesh ref={refThin} args={[geoThin, mat, totalSpokes]} />
      <instancedMesh ref={refMed} args={[geoMed, mat, totalSpokes]} />
      <instancedMesh ref={refThick} args={[geoThick, mat, totalSpokes]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
// 7. Coil Bracing
/* ------------------------------------------------------------------ */
export function CoilBracing({ mobile }: { mobile?: boolean }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL_DARK, metalness: 0.8, roughness: 0.6,
  }), []);

  const seg = mobile ? 8 : 16;
  const tubeSeg = mobile ? 32 : 64;

  return (
    <group>
      {[-0.8, 0.8].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.12, 0.025, seg, tubeSeg]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
// 8. Access Ports — instanced
/* ------------------------------------------------------------------ */
export function AccessPorts({ mobile }: { mobile?: boolean }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL, metalness: 0.7, roughness: 0.3,
  }), []);

  const portCount = 8;
  const pipeStart = 0.91;
  const pipeEnd = 1.78;
  const pipeLen = pipeEnd - pipeStart;
  const pipeCenter = pipeStart + (pipeLen / 2);
  const cylSeg = mobile ? 16 : 32;

  const geoPipe = useMemo(() => new THREE.CylinderGeometry(0.035, 0.035, pipeLen, cylSeg), [pipeLen, cylSeg]);
  const geoCollarSmall = useMemo(() => new THREE.CylinderGeometry(0.06, 0.06, 0.04, cylSeg), [cylSeg]);
  const geoCollarMed = useMemo(() => new THREE.CylinderGeometry(0.08, 0.08, 0.12, cylSeg), [cylSeg]);
  const geoCap = useMemo(() => new THREE.CylinderGeometry(0.05, 0.05, 0.04, cylSeg), [cylSeg]);

  const refPipe = useRef<THREE.InstancedMesh>(null);
  const refCollarSmall = useRef<THREE.InstancedMesh>(null);
  const refCollarMed = useRef<THREE.InstancedMesh>(null);
  const refCap = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const configs = [
      { ref: refPipe, pos: pipeCenter },
      { ref: refCollarSmall, pos: 0.93 },
      { ref: refCollarMed, pos: 1.65 },
      { ref: refCap, pos: 1.76 },
    ];

    configs.forEach(({ ref, pos }) => {
      if (!ref.current) return;
      for (let i = 0; i < portCount; i++) {
        const angle = (i / portCount) * Math.PI * 2 + (Math.PI / 16);
        setWorldMatrix(ref.current, i,
          [0, 0, 0], [0, angle, 0],
          [pos, 0, 0], [0, 0, -Math.PI / 2]
        );
      }
      ref.current.instanceMatrix.needsUpdate = true;
    });
  }, [pipeCenter, portCount]);

  return (
    <group>
      <instancedMesh ref={refPipe} args={[geoPipe, mat, portCount]} />
      <instancedMesh ref={refCollarSmall} args={[geoCollarSmall, mat, portCount]} />
      <instancedMesh ref={refCollarMed} args={[geoCollarMed, mat, portCount]} />
      <instancedMesh ref={refCap} args={[geoCap, mat, portCount]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
// 9. Exoskeleton & Containment Belts — instanced struts + joints
/* ------------------------------------------------------------------ */
export function Exoskeleton({ mobile }: { mobile?: boolean }) {
  const matStrut = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL, metalness: 0.8, roughness: 0.5,
  }), []);

  const matBelt = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL_DARK, metalness: 0.8, roughness: 0.2,
  }), []);

  const strutCount = 8;
  const radius = 1.65;
  const height = 4.0;
  const jointHeights = [1.25, 0, -1.25, -1.8];

  const beltSeg = mobile ? 16 : 32;
  const tubeSeg = mobile ? 32 : 64;
  const cylSeg = mobile ? 16 : 32;

  const strutGeo = useMemo(() => new THREE.BoxGeometry(0.08, height, 0.08), [height]);
  const jointGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.09, 0.14, cylSeg), [cylSeg]);

  const refStrut = useRef<THREE.InstancedMesh>(null);
  const refJoint = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    // Struts
    if (refStrut.current) {
      for (let i = 0; i < strutCount; i++) {
        const angle = (i / strutCount) * Math.PI * 2;
        setWorldMatrix(refStrut.current, i,
          [Math.cos(angle) * radius, 0, Math.sin(angle) * radius], [0, -angle, 0],
          [0, 0, 0], [0, 0, 0]
        );
      }
      refStrut.current.instanceMatrix.needsUpdate = true;
    }

    // Joints
    if (refJoint.current) {
      let idx = 0;
      for (let i = 0; i < strutCount; i++) {
        const angle = (i / strutCount) * Math.PI * 2;
        for (const y of jointHeights) {
          setWorldMatrix(refJoint.current, idx++,
            [Math.cos(angle) * radius, 0, Math.sin(angle) * radius], [0, -angle, 0],
            [0, y, 0], [Math.PI / 2, 0, 0]
          );
        }
      }
      refJoint.current.instanceMatrix.needsUpdate = true;
    }
  }, [strutCount, radius, jointHeights]);

  return (
    <group>
      {/* Horizontal Rings (Belts) */}
      {[-1.25, 1.25].map((y, i) => (
        <mesh key={`belt-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.04, beltSeg, tubeSeg]} />
          <primitive object={matBelt} attach="material" />
        </mesh>
      ))}
      {[0, -1.8].map((y, i) => (
        <mesh key={`ring-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.045, beltSeg, tubeSeg]} />
          <primitive object={matStrut} attach="material" />
        </mesh>
      ))}

      {/* Instanced Struts & Joints */}
      <instancedMesh ref={refStrut} args={[strutGeo, matStrut, strutCount]} />
      <instancedMesh ref={refJoint} args={[jointGeo, matStrut, strutCount * jointHeights.length]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
// 10. Support Pedestal
/* ------------------------------------------------------------------ */
export function SupportPedestal({ mobile }: { mobile?: boolean }) {
  const matConcrete = useMemo(() => new THREE.MeshStandardMaterial({
    color: CONCRETE, metalness: 0.1, roughness: 0.9,
  }), []);
  const matSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: STEEL, metalness: 0.8, roughness: 0.4,
  }), []);

  const seg = mobile ? 16 : 32;
  const ringSeg = mobile ? 32 : 64;

  return (
    <group position={[0, -1.6, 0]}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[1.2, 1.8, 0.6, seg]} />
        <primitive object={matConcrete} attach="material" />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.58, 0.8, 1.4, seg]} />
        <primitive object={matSteel} attach="material" />
      </mesh>
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.15, seg, ringSeg]} />
        <primitive object={matSteel} attach="material" />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.05, ringSeg]} />
        <primitive object={matSteel} attach="material" />
      </mesh>
    </group>
  );
}
