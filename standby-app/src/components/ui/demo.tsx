"use client";

import { ScrollFlyIn } from "@/components/ui/hero-section-3";

export default function ScrollFlyInDemo() {
  return (
    <div className="w-full bg-background text-foreground">
      <ScrollFlyIn
        imageUrl="/images/private-jet.webp"
        imageAlt="Top view of a private jet flying across the screen"
      >
        {/* This is the static text content */}
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-md font-semibold uppercase tracking-widest text-muted-foreground">
            Welcome to Airvoir
          </p>
          <h2 className="text-5xl md:text-7xl font-bold leading-tight mt-2">
            Where journeys become unforgettable
          </h2>
        </div>
      </ScrollFlyIn>
    </div>
  );
}
