"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@lib/animations";
import { Logo } from "@components/ui/Logo";

interface Stat {
    value: string;
    label: string;
}

interface Props {
    title: string;
    description: string;
    stats: Stat[];
}

export function AboutHero({ title, description, stats }: Props) {
    return (
        <section className="relative pt-36 pb-20 text-center overflow-hidden">
            <div className="relative z-10 px-4 sm:px-0">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="max-w-4xl mx-auto"
                >
                    {/* Badge */}
                    <motion.div variants={fadeInUp} className="mb-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                            <Logo size={16} />
                            About Us
                        </div>
                    </motion.div>

                    <motion.h1
                        variants={fadeInUp}
                        className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
                    >
                        {title.split(" ").slice(0, -1).join(" ")}{" "}
                        <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_60%,var(--foreground))] bg-clip-text text-transparent inline-block">
                            {title.split(" ").slice(-1)}
                        </span>
                    </motion.h1>

                    <motion.p
                        variants={fadeInUp}
                        className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                    >
                        {description}
                    </motion.p>

                    <motion.div
                        variants={fadeInUp}
                        className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4"
                    >
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: 0.4 + i * 0.1,
                                    duration: 0.5,
                                }}
                                className="relative group"
                            >
                                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                                    {/* Subtle top accent */}
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                    <div className="text-3xl sm:text-4xl font-bold text-primary">
                                        {stat.value}
                                    </div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {stat.label}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
