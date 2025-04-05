"use client";

import React, { Suspense, useRef } from 'react';
import * as THREE from 'three'; // Import the THREE namespace
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';

// Component to load and display the GLB model
function Model(props: any) {
  // Load the GLTF model from the public directory
  const { scene } = useGLTF('/person.glb'); // Path relative to the public folder

  // Optional: Animate the model slightly
  const modelRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (modelRef.current) {
      // Subtle breathing-like animation or idle sway
      modelRef.current.rotation.y += delta * 0.1;
      // modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  // Note: The 'scene' object contains the loaded model hierarchy.
  // We use primitive object={scene} to directly render it.
  // Adjust scale and position as needed.
  return <primitive ref={modelRef} object={scene} scale={1.5} position={[0, -1.5, 0]} {...props} />;
}

// Main Avatar component setting up the scene
const Avatar: React.FC = () => {
  return (
    <Canvas
        camera={{ position: [0, 0.5, 4], fov: 50 }} // Adjust camera position and field of view
        shadows // Enable shadows
        style={{ height: '100%', width: '100%' }}
    >
      {/* Ambient light affects the entire scene */}
      <ambientLight intensity={0.8} />
      {/* Directional light simulates sunlight */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSizeWidth={1024}
        shadow-mapSizeHeight={1024}
      />
       {/* Add another light source from a different angle */}
       <directionalLight position={[-5, 5, -5]} intensity={0.5} />

      {/* Suspense fallback allows loading state while model loads */}
      <Suspense fallback={null}>
        <Model />
      </Suspense>

      {/* OrbitControls allow user interaction (zoom, pan, rotate) */}
      <OrbitControls
        target={[0, 0.5, 0]} // Point controls towards the center of the model
        enablePan={false} // Disable panning if desired
        minDistance={2} // Set min zoom distance
        maxDistance={8} // Set max zoom distance
        enableDamping
        dampingFactor={0.1}
      />

      {/* Optional: Add environment lighting for reflections/realism */}
      {/* <Environment preset="sunset" /> */}
    </Canvas>
  );
};

// Preload the model (optional but can improve initial load time)
useGLTF.preload('/person.glb');

export default Avatar;