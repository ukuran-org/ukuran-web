import HeroBanner from "@/components/hero-banner";
import SectionTabs from "@/components/section-tabs";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col pb-16">
      <HeroBanner />
      <p className="mt-6 px-6 text-center text-lg">Description placeholder.</p>
      <div className="mt-10">
        <SectionTabs />
      </div>
    </main>
  );
}
