import { NebulaScene } from "@modules/home/components/three/NebulaScene";
import { DebugCanvasShell } from "../DebugCanvasShell";
import { useDebugTheme } from "../../hooks/useDebugTheme";

export function NebulaDebug() {
  const { primary, isLight } = useDebugTheme();

  const hud = (
    <>
      <p className="font-semibold text-primary">
        Nebula Background — Debug Mode
      </p>
      <p className="text-muted-foreground">
        Theme: {isLight ? "light" : "dark"} | Accent: {primary}
      </p>
      <p className="text-muted-foreground">
        Technique: Full-screen shader with FBM domain warp
      </p>
    </>
  );

  const infoBadge = (
    <>
      <p>Used in: TestimonialsSection</p>
      <p>Respects: data-theme (light/dark)</p>
    </>
  );

  return (
    <DebugCanvasShell hud={hud} infoBadge={infoBadge}>
      <NebulaScene isVisible={true} />
    </DebugCanvasShell>
  );
}
