import { HeroMotion } from './hero-motion';
import { CinematicHero } from './cinematic-hero';

export function HomeHero() {
  return (
    <HeroMotion>
      <CinematicHero />
    </HeroMotion>
  );
}
