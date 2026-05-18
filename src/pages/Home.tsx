import { ArrowRight, GraduationCap, Presentation, School } from "lucide-react";

const externalPageUrl = "https://reserv-ensam.com/";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(178,71,96,0.16),_transparent_34%),linear-gradient(180deg,#fff7f8_0%,#fffdfd_45%,#f6f1f2_100%)] text-[#1a1a2e]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-16 lg:px-10">
        <div className="mb-12 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b24760]/15 bg-white/75 px-4 py-2 text-sm font-medium text-[#8e3850] shadow-sm backdrop-blur">
            <Presentation className="h-4 w-4" />
            ADEAM
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1a1a2e] md:text-6xl">
            Discover the two entry points of the platform
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#5f6275] md:text-lg">
            This page introduces ADEAM and gives access to the StudyAM experience, alongside the external ENSAM reservation portal.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="group rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_70px_rgba(26,26,46,0.08)] backdrop-blur transition-transform duration-300 hover:-translate-y-1">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#b24760] to-[#8e3850] text-white shadow-lg shadow-[#b24760]/20">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold text-[#1a1a2e] md:text-3xl">
              StudyAM
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#5f6275]">
              Explore the StudyAM portal, its academic tools, and the dedicated landing page built specifically for that product.
            </p>
            <div className="mt-8">
              <a
                href="/studyam"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#b24760] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#b24760]/25 transition hover:bg-[#9f3f56]"
              >
                Open StudyAM
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="group rounded-[2rem] border border-white/60 bg-[#1a1a2e] p-8 text-white shadow-[0_20px_70px_rgba(26,26,46,0.16)] transition-transform duration-300 hover:-translate-y-1">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
              <School className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold md:text-3xl">
              ENSAM reservation portal
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/75">
              Go to the reservation page for ENSAM. This opens the external service used for reservations.
            </p>
            <div className="mt-8">
              <a
                href={externalPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white px-6 py-3 text-sm font-semibold text-[#1a1a2e] shadow-lg shadow-black/10 transition hover:bg-[#f4edf0]"
              >
                Visit reserv-ensam.com
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
