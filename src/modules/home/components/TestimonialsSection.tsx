"use client";

import { motion } from "framer-motion";
import { viewportOnce } from "@lib/animations";

import { TestimonialsCanvas } from "@modules/home/components/three/TestimonialsCanvas";
import { TestimonialCarousel } from "./TestimonialCarousel";
import type { TestimonialsSectionData } from "@modules/home/types";

interface Testimonial {
    quote: string;
    author: string;
    role: string;
    avatar: string;
}

interface TestimonialsSectionProps {
    data: TestimonialsSectionData;
    testimonials: Testimonial[];
}

/* ------------------------------------------------------------------ */
// Section
/* ------------------------------------------------------------------ */
export function TestimonialsSection({
    data,
    testimonials,
}: TestimonialsSectionProps) {
    const { sectionTitle, sectionSubtitle, badge } = data;

    return (
        <section className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden px-4 py-16 snap-section">
            {/* Three.js ambient background with edge fade */}
            <div
                className="absolute inset-0 -z-10"
                style={{
                    maskImage:
                        "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
                    WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
                }}
            >
                <TestimonialsCanvas />
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

                {/* 3D Carousel */}
                <TestimonialCarousel testimonials={testimonials} />
            </div>
        </section>
    );
}
