import { Canvas } from "@react-three/fiber";
import { ShowcaseScene } from "./ProjectEmblems";

interface ProjectsSceneProps {
  isVisible: boolean;
}

export function ProjectsScene({ isVisible }: ProjectsSceneProps) {
  return (
    <Canvas
      dpr={[1, 1]}
      camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 50 }}
      frameloop={isVisible ? "always" : "never"}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <ShowcaseScene visible={isVisible} />
    </Canvas>
  );
}
