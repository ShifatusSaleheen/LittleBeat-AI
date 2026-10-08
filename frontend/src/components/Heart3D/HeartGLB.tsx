import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../theme/ThemeContext';
import { SITES, VENTRICLE_SECONDARY } from '../../constants/anatomy';

const MODEL_URL = '/models/realistic_human_heart.glb';

// Degrees between adjacent faces before an edge counts as "visible" in the
// landing page's wireframe heart. Higher = fewer lines = bigger gaps.
// Try ~10-15 for a denser mesh, ~40-60 for a very sparse/low-poly look.
const WIREFRAME_EDGE_ANGLE =3;

// ── gradient environment (no external HDR fetch) — the reflections that
// make transmission glass read as glass, not flat plastic ──────────────
function GradientEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new THREE.Scene();
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0x2a4a6a) },
        bot: { value: new THREE.Color(0x0a0e17) },
      },
      vertexShader: `varying vec3 vp; void main(){ vp=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vp; uniform vec3 top; uniform vec3 bot;
        void main(){ float h=normalize(vp).y*0.5+0.5; gl_FragColor=vec4(mix(bot,top,h),1.0); }`,
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 32), envMat));
    const rt = pmrem.fromScene(envScene);
    scene.environment = rt.texture;
    return () => {
      rt.texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

// ── interior chambers as glowing point-clouds (the GLB is a single fused
// shell with no interior walls) ─────────────────────────────────────────
// Y sign verified against the real render: the great-vessel/atrial end is
// at +Y, the apex is at -Y. Ventricles (bigger, lower, near the apex) sit
// at negative Y; atria (smaller, upper, below the vessel roots) at positive
// Y — the reference prototype had this backwards (never checked against a
// live render), which is why the chambers looked wrong.
const CHAMBERS = [
  { name: 'LV', color: 0x2be3d2, pos: [0.22, -0.32, 0.02] as const, r: [0.3, 0.46, 0.26] as const, n: 500 },
  { name: 'RV', color: 0x3fb6ff, pos: [-0.26, -0.28, 0.05] as const, r: [0.26, 0.4, 0.22] as const, n: 420 },
  { name: 'LA', color: 0x0df0ac, pos: [0.2, 0.42, 0.0] as const, r: [0.22, 0.18, 0.2] as const, n: 220 },
  { name: 'RA', color: 0x6aa8ff, pos: [-0.22, 0.42, 0.02] as const, r: [0.2, 0.18, 0.18] as const, n: 200 },
];

function seededRand(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function Chambers({ visible }: { visible: boolean }) {
  const groups = useMemo(
    () =>
      CHAMBERS.map((ch) => {
        const rnd = seededRand((ch.pos[0] * 1000 + ch.pos[1] * 100 + 7) | 0);
        const positions = new Float32Array(ch.n * 3);
        for (let i = 0; i < ch.n; i++) {
          const u = rnd() * Math.PI * 2;
          const v = Math.acos(2 * rnd() - 1);
          const rr = Math.cbrt(rnd());
          positions[i * 3] = ch.pos[0] + ch.r[0] * rr * Math.sin(v) * Math.cos(u);
          positions[i * 3 + 1] = ch.pos[1] + ch.r[1] * rr * Math.cos(v);
          positions[i * 3 + 2] = ch.pos[2] + ch.r[2] * rr * Math.sin(v) * Math.sin(u);
        }
        return { ...ch, positions };
      }),
    [],
  );

  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    groupRef.current?.scale.setScalar(1 + 0.015 * Math.sin(t * 1.2 * Math.PI * 2));
  });

  if (!visible) return null;
  return (
    <group ref={groupRef} renderOrder={1}>
      {groups.map((ch) => (
        <group key={ch.name}>
          {/* solid-ish translucent chamber volume — the actual "you can see
              a chamber there" read; DoubleSide so it shows from any angle */}
          <mesh position={ch.pos} scale={ch.r} renderOrder={1}>
            <sphereGeometry args={[1, 24, 20]} />
            <meshBasicMaterial
              color={ch.color}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
            />
          </mesh>
          {/* brighter core so it doesn't read as a flat disc */}
          <mesh position={ch.pos} scale={[ch.r[0] * 0.55, ch.r[1] * 0.55, ch.r[2] * 0.55]} renderOrder={1}>
            <sphereGeometry args={[1, 20, 16]} />
            <meshBasicMaterial color={ch.color} transparent opacity={0.05} depthWrite={false} depthTest={false} />
          </mesh>
          {/* sparkle texture on top so it doesn't look like flat glass */}
          <points renderOrder={1}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[ch.positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
              color={0xffffff}
              size={0.05}
              transparent
              opacity={0.15}
              depthWrite={false}
              depthTest={false}
              sizeAttenuation
            />
          </points>
          <Html position={ch.pos} center distanceFactor={9} occlude={false}>
            <div
              style={{
                fontSize: 6,
                fontWeight: 600,
                letterSpacing: '.03em',
                fontFamily: 'ui-monospace, monospace',
                color: `#${ch.color.toString(16).padStart(6, '0')}`,
                
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {ch.name}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

// ── glass heart mesh, normalised to a consistent height ─────────────────
function HeartMesh({
  showTexture,
  wireframe,
  wireframeColor,
}: {
  showTexture: boolean;
  /** Landing-page decorative look — renders the shell as a wireframe mesh
   * instead of solid frosted glass, echoing the line-art hero reference. */
  wireframe?: boolean;
  wireframeColor?: string;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xb9c9dd,
        transparent: true,
        opacity: 0.4,
        roughness: 0.22,
        metalness: 0.0,
        // No `transmission` here on purpose — it stacks with `opacity` and
        // fades everything (including the chambers behind it) toward
        // invisible; plain alpha blending is far more predictable for a
        // "see the glowing chambers through the shell" look.
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide,
        // Critical: without this, the shell's front wall writes real depth
        // values and depth-tests away the chamber glows sitting behind it —
        // they were rendering, just invisibly discarded by the depth test.
        depthWrite: false,
      }),
    [],
  );

  const { holder, texMat } = useMemo(() => {
    const model = scene.clone(true);
    let originalMat: THREE.Material | THREE.Material[] | null = null;
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        originalMat = mesh.material;
        mesh.geometry.computeVertexNormals();
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = 2.4 / size.y;
    model.position.set(-center.x, -center.y, -center.z);
    const holderGroup = new THREE.Group();
    holderGroup.add(model);
    holderGroup.scale.setScalar(s);
    // Draw the shell after the chambers (renderOrder) so it always blends
    // on top of them rather than depending on distance-sort of nested
    // transparent geometry, which flickers/order-flips as the camera orbits.
    holderGroup.renderOrder = 2;
    return { holder: holderGroup, texMat: originalMat };
  }, [scene]);

  useEffect(() => {
    // Lines added directly by this effect (not part of the cloned GLTF
    // scene), tracked so the cleanup below can remove exactly these and
    // nothing else.
    const addedLines: THREE.LineSegments[] = [];

    holder.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const mesh = o as THREE.Mesh;

      if (wireframe) {
        // EdgesGeometry only keeps edges where adjacent faces meet at an
        // angle above the threshold — raising WIREFRAME_EDGE_ANGLE drops
        // more of the dense internal triangulation and leaves bigger gaps
        // between the remaining lines. A flat `wireframe: true` material
        // draws every triangle edge (angle 0), which is why that looked so
        // densely packed.
        mesh.visible = false;
        const edges = new THREE.EdgesGeometry(mesh.geometry, WIREFRAME_EDGE_ANGLE);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({
            color: wireframeColor ?? 0xffffff,
            transparent: true,
            opacity: 0.85,
          }),
        );
        line.position.copy(mesh.position);
        line.quaternion.copy(mesh.quaternion);
        line.scale.copy(mesh.scale);
        mesh.parent?.add(line);
        addedLines.push(line);
      } else {
        mesh.visible = true;
        mesh.material = showTexture && texMat ? texMat : glassMat;
      }
    });

    return () => {
      for (const line of addedLines) {
        line.parent?.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
    };
  }, [holder, showTexture, texMat, glassMat, wireframe, wireframeColor]);

  return <primitive object={holder} />;
}

useGLTF.preload(MODEL_URL);

// ── conduction-site markers ──────────────────────────────────────────────
function Marker({ pos, color }: { pos: [number, number, number]; color: string }) {
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    haloRef.current?.scale.setScalar(1 + 0.3 * Math.sin(t * 3));
  });
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.05, 20, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.14, 20, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function ScatterMarker({ pos, color }: { pos: [number, number, number]; color: string }) {
  const wisps = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return [pos[0] + Math.cos(a) * 0.16, pos[1] + Math.sin(a) * 0.12, pos[2]] as [number, number, number];
      }),
    [pos],
  );
  return (
    <>
      <Marker pos={pos} color={color} />
      {wisps.map((w, i) => (
        <mesh key={i} position={w}>
          <sphereGeometry args={[0.025, 10, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      ))}
    </>
  );
}

function LeadMarker({ pos, color }: { pos: [number, number, number]; color: string }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.0, -0.9, 0.5),
        new THREE.Vector3(-0.6, -0.3, 0.3),
        new THREE.Vector3(...pos),
      ]),
    [pos],
  );
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 24, 0.02, 8, false), [curve]);
  return (
    <>
      <Marker pos={pos} color={color} />
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </>
  );
}

function BranchMarker({ pos, color }: { pos: [number, number, number]; color: string }) {
  return <Marker pos={pos} color={color} />;
}

// Leader line + name tag pointing away from a glowing site marker — the
// callout style from anatomical diagrams (a stem out to a label), so the
// origin marker is identified without having to read the panel header.
function Callout({
  pos,
  color,
  label,
}: {
  pos: [number, number, number];
  color: string;
  label: string;
}) {
  const end = useMemo(() => {
    const dir = new THREE.Vector3(pos[0], pos[1], 0);
    if (dir.lengthSq() < 0.01) dir.set(0.4, 0.4, 0);
    dir.normalize().multiplyScalar(1.05);
    return [pos[0] + dir.x, pos[1] + dir.y, pos[2] + 0.12] as [number, number, number];
  }, [pos]);

  return (
    <>
      <Line points={[pos, end]} color={color} lineWidth={1} transparent opacity={0.7} depthTest={false} />
      <Html position={end} center distanceFactor={9} occlude={false}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: '.01em',
            fontFamily: 'ui-monospace, monospace',
            color,
            background: 'rgba(10,14,23,0.75)',
            border: `1px solid ${color}55`,
            padding: '0px 5px',
            borderRadius: 5,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {label}
        </div>
      </Html>
    </>
  );
}

interface Localization {
  render: string; // 'point' | 'scatter' | 'lead' | 'branch_right' | 'region_both_ventricles' | 'multi_probable' | 'multi_simultaneous' | 'none'
  site_id: string | null;
  label: string;
  origins?: { site_id: string; label: string }[] | null;
}

function markerFor(site: (typeof SITES)[string], color: string) {
  switch (site.render) {
    case 'scatter':
      return <ScatterMarker pos={site.pos} color={color} />;
    case 'lead':
      return <LeadMarker pos={site.pos} color={color} />;
    case 'branch':
      return <BranchMarker pos={site.pos} color={color} />;
    default:
      return <Marker pos={site.pos} color={color} />;
  }
}

function MarkerLayer({ localization }: { localization: Localization }) {
  const { C } = useTheme();
  const { render, site_id: siteId, label, origins } = localization;

  if (render === 'region_both_ventricles') {
    return (
      <>
        <Marker pos={SITES.ventricular_myocardium.pos} color={C.amber} />
        <Callout pos={SITES.ventricular_myocardium.pos} color={C.amber} label={label} />
        <Marker pos={VENTRICLE_SECONDARY} color={C.amber} />
        <Callout pos={VENTRICLE_SECONDARY} color={C.amber} label={label} />
      </>
    );
  }

  // Several possible-but-mutually-exclusive origins (e.g. "Other", which
  // merged LBBB/AVB1/SVT during training) — show all of them, tinted amber
  // as a group to signal "unconfirmed", each numbered so it reads as a
  // list of alternatives rather than a set of simultaneous findings.
  if (render === 'multi_probable' && origins && origins.length > 0) {
    return (
      <>
        {origins.map((o, i) => {
          const site = SITES[o.site_id];
          if (!site) return null;
          return (
            <group key={o.site_id}>
              {markerFor(site, C.amber)}
              <Callout pos={site.pos} color={C.amber} label={`${i + 1}. ${o.label}`} />
            </group>
          );
        })}
      </>
    );
  }

  // Two genuinely simultaneous origins (Fusion: a sinus impulse and a
  // ventricular ectopic focus colliding at the same moment, by definition)
  // — unlike multi_probable, both are real and happen together, so each
  // keeps its own natural site color and no numbering (numbering would
  // wrongly imply "pick one").
  if (render === 'multi_simultaneous' && origins && origins.length > 0) {
    return (
      <>
        {origins.map((o) => {
          const site = SITES[o.site_id];
          if (!site) return null;
          return (
            <group key={o.site_id}>
              {markerFor(site, site.color)}
              <Callout pos={site.pos} color={site.color} label={o.label} />
            </group>
          );
        })}
      </>
    );
  }

  if (render === 'none' || !siteId) return null;

  const site = SITES[siteId];
  if (!site) return null;

  return (
    <>
      {markerFor(site, site.color)}
      <Callout pos={site.pos} color={site.color} label={label} />
    </>
  );
}

export function HeartGLB({
  localization,
  decorative,
}: {
  localization: Localization;
  /** Ambient/hero use (e.g. the landing page) — a frozen, non-interactive
   * still render (no auto-rotate, no drag/zoom) at a fixed three-quarter
   * angle, plus hides the clinical "no origin" overlay and the rotate/zoom
   * hint. Clinical call sites (AnalysisView) don't pass this, so their
   * behavior — including the live OrbitControls — is unchanged. */
  decorative?: boolean;
}) {
  const { C } = useTheme();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: decorative ? [1.4, 0.35, 3.3] : [0, 0, 6], fov: decorative ? 48 : 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{
          background: decorative
            ? 'transparent'
            : `radial-gradient(ellipse at 50% 42%, ${C.panel2} 0%, ${C.bg} 76%)`,
        }}
      >
        <GradientEnvironment />
        <ambientLight color={0x4a6a9a} intensity={0.4} />
        <directionalLight color={0xffffff} intensity={1.4} position={[4, 6, 8]} />
        <directionalLight color={0x7dd3c0} intensity={0.5} position={[-6, -2, -4]} />
        <pointLight color={0xa8d4ff} intensity={0.8} distance={30} position={[0, 3, -8]} />
        {/* Subtle brand-accent rim light — warms the render without
            competing with the cool key/fill lights chambers rely on for
            readability. */}
        <pointLight color={C.primary} intensity={0.35} distance={20} position={[2, -3, 5]} />

        <HeartMesh showTexture={false} wireframe={decorative} wireframeColor={C.primary} />
        <Chambers visible={!decorative} />
        <MarkerLayer localization={localization} />

        {!decorative && (
          <OrbitControls autoRotate autoRotateSpeed={1.2} enableDamping dampingFactor={0.08} />
        )}
      </Canvas>
      {!decorative && localization.render === 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              color: C.dim,
              fontSize: 12,
              textAlign: 'center',
              maxWidth: 200,
              lineHeight: 1.5,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: '14px 16px',
              background: C.panel2 + 'dd',
            }}
          >
            No single anatomical origin for this class.
          </div>
        </div>
      )}
      {!decorative && (
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: C.faint, pointerEvents: 'none' }}>
          drag to rotate · scroll to zoom
        </div>
      )}
    </div>
  );
}
