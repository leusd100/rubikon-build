/** A normal-flow phone cue: its target stays above Safari while the photograph continues below it. */
export function PhoneHeroScroll({ href }: { href: string }) {
  return <a className="phone-hero-scroll" href={href} aria-label="До наступного розділу">↓</a>;
}
