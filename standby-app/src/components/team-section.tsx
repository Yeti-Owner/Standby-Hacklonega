import Image from "next/image";
import { Sparkles } from "lucide-react";

export default function TeamSection() {
  return (
    <section id="creators" className="relative z-30 pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Section Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-sky-200/80 text-sky-900 text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Hackathon Project Team
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight drop-shadow-xs">
          Crafted by Pilots of Code
        </h2>
        <p className="mt-3 text-base sm:text-lg text-sky-950 font-semibold max-w-2xl mx-auto">
          Meet the minds behind <span className="font-extrabold underline decoration-amber-400 decoration-2">Standby</span>
        </p>
      </div>

      {/* Creator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto">
        {/* Tomas Karounas Card */}
        <div className="group relative bg-white/95 backdrop-blur-md rounded-3xl border border-sky-100 p-8 sm:p-10 shadow-xl hover:shadow-2xl hover:border-sky-300 transition-all duration-300 flex flex-col items-center text-center">
          {/* Centered Profile Image */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-sky-400/40 shadow-lg mb-5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
            <Image
              src="/images/tomas.jpg"
              alt="Tomas Karounas"
              fill
              className="object-cover object-top"
              sizes="128px"
            />
          </div>

          {/* Centered Name */}
          <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-1.5">
            Tomas Karounas
          </h3>

          {/* Centered University & Major */}
          <p className="text-sky-800 text-base font-semibold mb-1">
            University of North Georgia
          </p>
          <p className="text-slate-600 text-sm font-medium mb-6">
            Computer Science
          </p>

          {/* Clean Pill-Shaped Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-slate-100 w-full mt-auto">
            <span className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors shadow-xs">
              Reading
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors shadow-xs">
              Chess
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors shadow-xs">
              Judo
            </span>
          </div>
        </div>

        {/* Callum Maclean Card */}
        <div className="group relative bg-white/95 backdrop-blur-md rounded-3xl border border-sky-100 p-8 sm:p-10 shadow-xl hover:shadow-2xl hover:border-sky-300 transition-all duration-300 flex flex-col items-center text-center">
          {/* Centered Profile Image */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-amber-400/40 shadow-lg mb-5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
            <Image
              src="/images/callum.jpg"
              alt="Callum Maclean"
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>

          {/* Centered Name */}
          <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-1.5">
            Callum Maclean
          </h3>

          {/* Centered University & Major */}
          <p className="text-sky-800 text-base font-semibold mb-1">
            University of North Georgia
          </p>
          <p className="text-slate-600 text-sm font-medium mb-6">
            Computer Science
          </p>

          {/* Clean Pill-Shaped Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-slate-100 w-full mt-auto">
            <span className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors shadow-xs">
              Hiking
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors shadow-xs">
              Dogs
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors shadow-xs">
              Game Dev
            </span>
          </div>
        </div>
      </div>

      {/* Footer signoff */}
      <div className="mt-16 text-center text-xs text-sky-950">
        <p className="font-bold">
          Created for the Hackathon by Tomas Karounas & Callum Maclean • Powered by Next.js, WebGL & D3
        </p>
        <p className="mt-1 text-sky-900/80 font-mono text-[11px] font-semibold">
          Standby v1.0 • All coordinates and aeronautical waypoint data calibrated
        </p>
      </div>
    </section>
  );
}
