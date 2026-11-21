import HeroBanner from "@/components/hero-banner";
import SectionTabs from "@/components/section-tabs";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col pb-16">
      <HeroBanner />
      <div className="mt-6 sm:mt-8">
        <SectionTabs />
      </div>
    </main>
  );
}
