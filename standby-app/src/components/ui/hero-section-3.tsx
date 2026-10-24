"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ScrollFlyInProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  imageUrl?: string;
  imageAlt?: string;
}

const ScrollFlyIn = React.forwardRef<HTMLDivElement, ScrollFlyInProps>(
  (
    {
      children,
      imageUrl = "/images/private-jet.webp",
      imageAlt = "Top view of a private jet flying across the screen",
      className,
      ...props
    },
    ref
  ) => {
    const targetRef = React.useRef<HTMLDivElement>(null);
    const [screenWidth, setScreenWidth] = React.useState(1920);

    React.useEffect(() => {
      const initialResize = requestAnimationFrame(() => setScreenWidth(window.innerWidth));
      const handleResize = () => setScreenWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => { cancelAnimationFrame(initialResize); window.removeEventListener("resize", handleResize); };
    }, []);

    const { scrollYProgress } = useScroll({
      target: targetRef,
      offset: ["start end", "end start"],
    });

    // Horizontal flight path from off-screen left to off-screen right
    const x = useTransform(
      scrollYProgress,
      [0.05, 0.95],
      [`-${1.8 * screenWidth}px`, `${1.8 * screenWidth}px`]
    );

    // Subtle aerodynamic lift as the aircraft glides forward
    const y = useTransform(scrollYProgress, [0.1, 0.5, 0.9], [30, 0, -30]);

    // Subtle realistic bank angle
    const rotate = useTransform(scrollYProgress, [0.1, 0.5, 0.9], [-2, 0, 1.5]);

    // Smooth entry and exit opacity
    const opacity = useTransform(
      scrollYProgress,
      [0.05, 0.2, 0.8, 0.95],
      [0, 1, 1, 0]
    );

    return (
      <div
        ref={node => { targetRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
        className={cn(
          "relative w-full h-[60vh] sm:h-[70vh] md:h-[80vh] overflow-x-clip pointer-events-none z-30 flex items-center justify-center",
          className
        )}
        {...props}
      >
        {children && (
          <div className="relative z-10 text-center pointer-events-auto">
            {children}
          </div>
        )}

        {/* Big, Cinematic Animated Airplane */}
        <motion.div
          style={{ x, y, rotate, opacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        >
          <Image unoptimized width={1600} height={900}
            src={imageUrl}
            alt={imageAlt}
            className="w-auto h-[48vh] sm:h-[58vh] md:h-[68vh] max-w-none filter drop-shadow-[0_25px_45px_rgba(15,23,42,0.30)] drop-shadow-[0_8px_16px_rgba(2,132,199,0.20)]"
            onError={(e) => {
              e.currentTarget.src = "/images/jet-fallback.svg";
            }}
          />
        </motion.div>
      </div>
    );
  }
);

ScrollFlyIn.displayName = "ScrollFlyIn";

export { ScrollFlyIn };
