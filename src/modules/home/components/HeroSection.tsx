import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@lib/animations";
import { HeroCanvas } from "@modules/home/components/three/HeroCanvas";
import { SplitText } from "@components/shared/SplitText";
import { MagneticButton } from "@components/shared/MagneticButton";
import { HeroStatCard } from "./HeroStatCard";
import { getIcon } from "@lib/icons";
import type { HeroData } from "@modules/home/types";

interface HeroSectionProps {
    data: HeroData;
}

export function HeroSection({ data }: HeroSectionProps) {
    const { badge, headline, subtitle, ctas, stats } = data;

    return (
        <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-4 snap-section">
            {/* 3D Canvas Background — subtle in light mode, full in dark mode */}
            <div className="absolute inset-0 -z-20 opacity-[0.28] dark:opacity-100 transition-opacity duration-700">
                <HeroCanvas />
            </div>

            {/* Top fade */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-transparent to-transparent" />

            {/* Bottom fade for text readability */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/90 to-transparent" />

            {/* Main Content */}
            <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pt-24 pb-8 sm:pt-28 sm:pb-12 lg:pt-32">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    variants={staggerContainer}
                    className="flex w-full flex-col items-center text-center"
                >
                    {/* Badge */}
                    <motion.div variants={fadeInUp}>
                        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md sm:mb-8">
                            {badge.showLiveDot && (
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                </span>
                            )}
                            {badge.text}
                        </span>
                    </motion.div>

                    {/* Headline with kinetic typography */}
                    <h1 className="perspective-text max-w-5xl text-5xl font-extrabold tracking-tighter text-foreground sm:text-6xl md:text-6xl lg:text-7xl xl:text-8xl">
                        <span className="block">
                            <SplitText
                                text={headline.line1.prefix}
                                delay={0.2}
                                staggerDelay={0.05}
                            />
                            <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_60%,var(--foreground))] bg-clip-text text-transparent">
                                <SplitText
                                    text={headline.line1.highlight}
                                    delay={0.45}
                                    staggerDelay={0.06}
                                />
                            </span>
                        </span>
                        <span className="block mt-1 sm:mt-2">
                            <SplitText
                                text={headline.line2}
                                delay={0.7}
                                staggerDelay={0.05}
                            />
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <motion.p
                        variants={fadeInUp}
                        className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:mt-8 sm:text-xl"
                    >
                        {subtitle}
                    </motion.p>

                    {/* CTAs with magnetic effect */}
                    <motion.div
                        variants={fadeInUp}
                        className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:mt-10"
                    >
                        {ctas.map((cta, i) => {
                            const CtaIcon = cta.icon ? getIcon(cta.icon) : null;
                            const isPrimary = cta.variant === "primary";
                            return (
                                <MagneticButton
                                    key={i}
                                    href={cta.href}
                                    className={`group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold transition-shadow duration-300 active:scale-[0.98] ${
                                        isPrimary
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                                            : "border border-input bg-background/60 text-foreground backdrop-blur-md hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                >
                                    {cta.text}
                                    {CtaIcon && (
                                        <CtaIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                    )}
                                </MagneticButton>
                            );
                        })}
                    </motion.div>

                    {/* Stats Row — inline below CTAs so they're visible without scrolling */}
                    <motion.div
                        variants={fadeInUp}
                        className="mt-8 w-full max-w-3xl sm:mt-10"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                            {stats.map((stat, i) => (
                                <HeroStatCard
                                    key={stat.label}
                                    iconName={stat.icon}
                                    value={stat.value}
                                    numericValue={stat.numericValue}
                                    label={stat.label}
                                    index={i}
                                />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
