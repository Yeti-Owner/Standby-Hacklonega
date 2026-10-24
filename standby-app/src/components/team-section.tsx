import Image from "next/image";
import { GraduationCap, BookOpen, Utensils, Award, Sparkles, Gamepad2, Trees, Heart } from "lucide-react";

export default function TeamSection() {
  return (
    <section id="creators" className="relative z-30 pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Section Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-sky-200/80 text-sky-900 text-xs font-bold tracking-wider uppercase mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Hackathon Project Team
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight drop-shadow-xs">
          Crafted by Pilots of Code
        </h2>
        <p className="mt-3 text-base sm:text-lg text-sky-950 font-semibold max-w-2xl mx-auto">
          Meet the minds behind <span className="font-extrabold underline decoration-amber-400 decoration-2">Standby</span> — built with passion for aviation intelligence, real-time telemetry, and sleek interfaces.
        </p>
      </div>

      {/* Creator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Tomas Karounas Card */}
        <div className="group relative bg-white/95 backdrop-blur-md rounded-3xl border border-sky-100 p-8 shadow-xl hover:shadow-2xl hover:border-sky-300 transition-all duration-500 flex flex-col justify-between">
          <div className="absolute top-6 right-6 px-3 py-1 bg-sky-50 border border-sky-200/60 rounded-full text-xs font-bold text-sky-700">
            Co-Creator
          </div>

          <div>
            {/* Avatar & Title */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-3 border-sky-500/40 shadow-lg group-hover:scale-105 transition-transform duration-500 flex-shrink-0">
                <Image
                  src="/images/tomas.jpg"
                  alt="Tomas Karounas"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 112px, 128px"
                />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Tomas Karounas
                </h3>
                <div className="flex items-center gap-1.5 text-sky-700 font-semibold text-sm mt-1">
                  <GraduationCap className="w-4 h-4 text-sky-600" />
                  <span>University of North Georgia</span>
                </div>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-medium">
                  Major: Computer Science
                </div>
              </div>
            </div>

            {/* Hobbies & Highlights */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Passions & Hobbies
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900 text-xs font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    Reading
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-900 text-xs font-semibold">
                    <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                    Cooking
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200/60 text-sky-900 text-xs font-semibold">
                    <Award className="w-3.5 h-3.5 text-sky-600" />
                    Chess
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed font-normal pt-2">
                Passionate about distributed web architectures, interactive canvas rendering, and designing seamless travel intelligence tools for passengers and pilots alike.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>UNG Nighthawks</span>
            <span className="font-mono text-sky-600 font-semibold">Standby Core Team</span>
          </div>
        </div>

        {/* Callum Maclean Card */}
        <div className="group relative bg-white/95 backdrop-blur-md rounded-3xl border border-sky-100 p-8 shadow-xl hover:shadow-2xl hover:border-sky-300 transition-all duration-500 flex flex-col justify-between">
          <div className="absolute top-6 right-6 px-3 py-1 bg-amber-50 border border-amber-200/60 rounded-full text-xs font-bold text-amber-700">
            Co-Creator
          </div>

          <div>
            {/* Avatar & Title */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-3 border-amber-500/40 shadow-lg group-hover:scale-105 transition-transform duration-500 flex-shrink-0">
                <Image
                  src="/images/callum.jpg"
                  alt="Callum Maclean"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 112px, 128px"
                />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Callum Maclean
                </h3>
                <div className="flex items-center gap-1.5 text-sky-700 font-semibold text-sm mt-1">
                  <GraduationCap className="w-4 h-4 text-sky-600" />
                  <span>University of North Georgia</span>
                </div>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-medium">
                  Major: Computer Science
                </div>
              </div>
            </div>

            {/* Hobbies & Highlights */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Passions & Hobbies
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-900 text-xs font-semibold">
                    <Trees className="w-3.5 h-3.5 text-teal-600" />
                    Hiking
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-900 text-xs font-semibold">
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    My Dogs & Playing with Them
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-900 text-xs font-semibold">
                    <Gamepad2 className="w-3.5 h-3.5 text-indigo-600" />
                    Game Development
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed font-normal pt-2">
                Focused on simulation systems, interactive 3D visualizations, and crafting joyful, responsive experiences that bring data to life on any screen.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>UNG Nighthawks</span>
            <span className="font-mono text-amber-600 font-semibold">Standby Core Team</span>
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
