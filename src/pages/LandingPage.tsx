import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingQuickContext from "@/components/landing/LandingQuickContext";
import LandingProductSections from "@/components/landing/LandingProductSections";
import LandingEfficiency from "@/components/landing/LandingEfficiency";
import LandingComparison from "@/components/landing/LandingComparison";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import SectionFadeIn from "@/components/landing/SectionFadeIn";

const LandingPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  const scrollToForm = () =>
    document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: "#0F1115", fontFamily: "Inter, sans-serif" }}
    >
      <LandingNavbar isLoggedIn={isLoggedIn} onCtaClick={scrollToForm} />

      <SectionFadeIn>
        <LandingHero />
      </SectionFadeIn>

      <SectionFadeIn>
        <LandingQuickContext />
      </SectionFadeIn>

      <SectionFadeIn>
        <LandingProductSections />
      </SectionFadeIn>

      <SectionFadeIn>
        <LandingEfficiency />
      </SectionFadeIn>

      <SectionFadeIn>
        <LandingComparison />
      </SectionFadeIn>

      <SectionFadeIn>
        <LandingPricing onGetStarted={scrollToForm} />
      </SectionFadeIn>

      <SectionFadeIn>
        <LandingFAQ />
      </SectionFadeIn>

      <SectionFadeIn>
        <LandingCTA />
      </SectionFadeIn>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
