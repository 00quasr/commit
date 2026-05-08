import { Footer } from "../components/sections/Footer";
import { Hero } from "../components/sections/Hero";
import { HowItWorks } from "../components/sections/HowItWorks";
import { Nav } from "../components/sections/Nav";
import { ProfileFeature } from "../components/sections/ProfileFeature";
import { ReciprocityFeature } from "../components/sections/ReciprocityFeature";
import { WaitlistCTA } from "../components/sections/WaitlistCTA";

// LiveCount queries Convex per render; cap to once a minute per region.
export const revalidate = 60;

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <ReciprocityFeature />
        <ProfileFeature />
        <WaitlistCTA />
      </main>
      <Footer />
    </>
  );
}
