import { motion } from "framer-motion";
import { viewportOnce } from "@lib/animations";
import { getIcon } from "@lib/icons";
import { MissionCanvas } from "@modules/home/components/three/MissionCanvas";
import type { MissionData } from "@modules/home/types";

interface MissionStripProps {
  data: MissionData;
}

/* ------------------------------------------------------------------ */
// Unique entrance per index
/* ------------------------------------------------------------------ */
const ENTRANCES = [
  { x: -60, y: 0, scale: 0.96 },
  { x: 0, y: 50, scale: 0.96 },
  { x: 60, y: 0, scale: 0.96 },
  { x: -60, y: 0, scale: 0.96 },
  { x: 60, y: 0, scale: 0.96 },
];

/* ------------------------------------------------------------------ */
// Adaptive grid based on item count
/* ------------------------------------------------------------------ */
function gridClasses(count: number): string {
  const base = "grid grid-cols-1 gap-5 sm:grid-cols-2";
  if (count === 2) return `${base} lg:grid-cols-2 lg:max-w-5xl lg:mx-auto`;
  if (count === 3) return `${base} lg:grid-cols-3 lg:max-w-7xl`;
  if (count === 4) return `${base} lg:grid-cols-2 lg:max-w-5xl lg:mx-auto`;
  // 5 items: 3 top + 2 bottom centered
  return `${base} lg:grid-cols-3 lg:max-w-6xl lg:mx-auto [&>*:nth-child(4)]:lg:col-start-2`;
}

/* ------------------------------------------------------------------ */
// Single pillar card
/* ------------------------------------------------------------------ */
function PillarCard({
  pillar,
  index,
}: {
  pillar: MissionData["pillars"][0];
  index: number;
}) {
  const Icon = getIcon(pillar.icon);
  const step = String(index + 1).padStart(2, "0");
  const entrance = ENTRANCES[index % ENTRANCES.length];

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: entrance.x,
        y: entrance.y,
        scale: entrance.scale,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={viewportOnce}
      transition={{
        duration: 0.7,
        delay: index * 0.12,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      className="group bubble relative h-full flex flex-col overflow-hidden p-5 shadow-lg shadow-black/[0.06] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/[0.08] dark:shadow-sm dark:hover:border-primary/20 dark:hover:shadow-2xl dark:hover:shadow-primary/[0.04] sm:p-7"
    >
      <div className="flex h-full flex-col">
        {/* Subtle brand tint gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent dark:from-primary/[0.02]" />

        {/* Giant step watermark */}
        <span className="pointer-events-none absolute right-2 top-1 select-none text-[3.5rem] font-extrabold leading-none text-primary/15 transition-colors duration-500 group-hover:text-primary/25 dark:text-foreground/[0.02] dark:group-hover:text-primary/[0.04] sm:text-[4.5rem]">
          {step}
        </span>

        {/* Radial glow on hover */}
        <div className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/[0.1] opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100 dark:bg-primary/5" />

        {/* Icon */}
        <div className="relative mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/35 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/30 group-hover:ring-primary/55 dark:bg-primary/[0.08] dark:ring-primary/15 dark:group-hover:bg-primary/[0.14] dark:group-hover:ring-primary/25">
          {Icon && <Icon className="h-5 w-5" strokeWidth={1.5} />}
        </div>

        {/* Title */}
        <h3 className="relative mb-3 text-xl font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
          {pillar.title}
        </h3>

        {/* Description */}
        <p className="relative flex-1 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]/[1.65]">
          {pillar.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
// Section
/* ------------------------------------------------------------------ */
export function MissionStrip({ data }: MissionStripProps) {
  const { sectionTitle, sectionSubtitle, badge, pillars } = data;
  const gridClass = gridClasses(pillars.length);

  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden px-4 py-16 snap-section">
      {/* Ambient background — masked separately so cards can blur it */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
      >
        <MissionCanvas />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{
            duration: 0.6,
            ease: [0.215, 0.61, 0.355, 1],
          }}
          className="mb-16 text-center sm:mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {badge}
          </motion.span>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {sectionTitle}
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            {sectionSubtitle}
          </motion.p>
        </motion.div>

        {/* Cards grid */}
        <div className={gridClass}>
          {pillars.map((pillar, i) => (
            <PillarCard key={pillar.title} pillar={pillar} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
