import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";

interface ScaffoldingSceneProps {
  height: number;
  length: number;
  showCatwalk: boolean;
  showRailing: boolean;
}

// Main Frame Component - Blue color
function MainFrame({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Left vertical pole */}
      <mesh position={[-0.45, 0.85, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.7, 8]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Right vertical pole */}
      <mesh position={[0.45, 0.85, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.7, 8]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Top horizontal bar */}
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Bottom horizontal bar */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Cross Brace Component - Yellow color
function CrossBrace({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const length = Math.sqrt(0.9 * 0.9 + 1.7 * 1.7);
  const angle = Math.atan2(1.7, 0.9);
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* X brace - first diagonal */}
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, angle]}>
        <cylinderGeometry args={[0.015, 0.015, length, 6]} />
        <meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* X brace - second diagonal */}
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, -angle]}>
        <cylinderGeometry args={[0.015, 0.015, length, 6]} />
        <meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Jack Base Component - Gray color
function JackBase({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base plate */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.15, 0.04, 0.15]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Screw thread */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

// U-Head Component - Red color
function UHead({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
        <meshStandardMaterial color="#ef4444" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* U shape - left arm */}
      <mesh position={[-0.05, 0.1, 0]}>
        <boxGeometry args={[0.02, 0.1, 0.02]} />
        <meshStandardMaterial color="#ef4444" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* U shape - right arm */}
      <mesh position={[0.05, 0.1, 0]}>
        <boxGeometry args={[0.02, 0.1, 0.02]} />
        <meshStandardMaterial color="#ef4444" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Catwalk Component - Green color
function Catwalk({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[length, 0.04, 0.4]} />
      <meshStandardMaterial color="#22c55e" metalness={0.3} roughness={0.6} transparent opacity={0.8} />
    </mesh>
  );
}

// Railing Component - Orange color
function Railing({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <group position={position}>
      {/* Top rail */}
      <mesh position={[0, 0.5, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, length, 8]} />
        <meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Mid rail */}
      <mesh position={[0, 0.25, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, length, 8]} />
        <meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Main Scaffolding Structure
function ScaffoldingStructure({ height, length, showCatwalk, showRailing }: ScaffoldingSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate levels and bays
  const levels = Math.max(1, Math.ceil(height / 1.7));
  const bays = Math.max(1, Math.ceil(length / 0.95));
  
  // Auto-rotate slowly
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.3;
    }
  });

  const scaffolding = useMemo(() => {
    const elements: JSX.Element[] = [];
    const bayWidth = 0.95;
    const levelHeight = 1.7;
    const startX = -((bays - 1) * bayWidth) / 2;

    // Build scaffolding structure
    for (let bay = 0; bay < bays; bay++) {
      const xPos = startX + bay * bayWidth;

      for (let level = 0; level < levels; level++) {
        const yPos = level * levelHeight;

        // Front frames
        elements.push(
          <MainFrame 
            key={`frame-front-${bay}-${level}`} 
            position={[xPos, yPos, 0.3]} 
          />
        );
        // Back frames
        elements.push(
          <MainFrame 
            key={`frame-back-${bay}-${level}`} 
            position={[xPos, yPos, -0.3]} 
          />
        );

        // Cross braces on sides
        elements.push(
          <CrossBrace 
            key={`brace-front-${bay}-${level}`} 
            position={[xPos, yPos, 0.3]} 
          />
        );
        elements.push(
          <CrossBrace 
            key={`brace-back-${bay}-${level}`} 
            position={[xPos, yPos, -0.3]} 
          />
        );

        // Catwalk on each level
        if (showCatwalk && level > 0) {
          elements.push(
            <Catwalk 
              key={`catwalk-${bay}-${level}`} 
              position={[xPos, yPos + 0.02, 0]} 
              length={bayWidth}
            />
          );
        }

        // Railing on each level
        if (showRailing && level > 0) {
          elements.push(
            <Railing 
              key={`railing-${bay}-${level}`} 
              position={[xPos, yPos, 0]} 
              length={bayWidth}
            />
          );
        }
      }

      // Jack bases at the bottom
      elements.push(
        <JackBase key={`jack-front-left-${bay}`} position={[xPos - 0.45, -0.1, 0.3]} />
      );
      elements.push(
        <JackBase key={`jack-front-right-${bay}`} position={[xPos + 0.45, -0.1, 0.3]} />
      );
      elements.push(
        <JackBase key={`jack-back-left-${bay}`} position={[xPos - 0.45, -0.1, -0.3]} />
      );
      elements.push(
        <JackBase key={`jack-back-right-${bay}`} position={[xPos + 0.45, -0.1, -0.3]} />
      );

      // U-heads at the top
      const topY = levels * levelHeight;
      elements.push(
        <UHead key={`uhead-front-left-${bay}`} position={[xPos - 0.45, topY + 0.1, 0.3]} />
      );
      elements.push(
        <UHead key={`uhead-front-right-${bay}`} position={[xPos + 0.45, topY + 0.1, 0.3]} />
      );
      elements.push(
        <UHead key={`uhead-back-left-${bay}`} position={[xPos - 0.45, topY + 0.1, -0.3]} />
      );
      elements.push(
        <UHead key={`uhead-back-right-${bay}`} position={[xPos + 0.45, topY + 0.1, -0.3]} />
      );
    }

    // Top catwalk
    if (showCatwalk) {
      const totalWidth = bays * bayWidth;
      elements.push(
        <Catwalk 
          key="catwalk-top" 
          position={[0, levels * levelHeight + 0.02, 0]} 
          length={totalWidth}
        />
      );
    }

    // Top railing
    if (showRailing) {
      const totalWidth = bays * bayWidth;
      elements.push(
        <Railing 
          key="railing-top" 
          position={[0, levels * levelHeight, 0]} 
          length={totalWidth}
        />
      );
    }

    return elements;
  }, [levels, bays, showCatwalk, showRailing]);

  // Center the structure vertically
  const centerY = -(levels * 1.7) / 2;

  return (
    <group ref={groupRef} position={[0, centerY + 1, 0]}>
      {scaffolding}
    </group>
  );
}

// Ground plane
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#374151" transparent opacity={0.3} />
    </mesh>
  );
}

export default function ScaffoldingScene(props: ScaffoldingSceneProps) {
  const cameraDistance = Math.max(5, props.height * 0.8 + props.length * 0.5);

  return (
    <Canvas shadows>
      <PerspectiveCamera makeDefault position={[cameraDistance, cameraDistance * 0.6, cameraDistance]} fov={50} />
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, 10, -5]} intensity={0.5} />
      
      <ScaffoldingStructure {...props} />
      <Ground />
      <Grid 
        args={[20, 20]} 
        position={[0, -0.49, 0]} 
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={30}
        fadeStrength={1}
      />
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
      />
      <Environment preset="city" />
    </Canvas>
  );
}
