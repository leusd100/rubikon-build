// The corn crop's icon (W3-06, PDO-89): a cob in its husk, drawn on lucide's 24 px grid with lucide's round caps and
// joins, so it sits among the other crops' lucide icons (wheat, sunflower, soy…) as one of them. lucide has no corn; its
// «Vegan» glyph stood in for it until W3-06. Decorative: the chip or the tile beside it says «Кукурудза». The stroke
// is the site's one icon stroke (svg.lucide, globals.css), the colour the crop's own (currentColor).
export function CornCobIcon() {
  return (
    <svg
      className="lucide lucide-corn-cob"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* the ear, its rows of kernels, the two husk leaves and the stalk. It fills the grid as wheat and rapeseed do
          (x 3.6–20.4, y 2–22; it was 5.6–18.4 and read small beside them, W3-06 review) */}
      <path d="M12 2c2.8 0 4.4 3 4.4 7.2 0 4-1.8 7.3-4.4 7.3s-4.4-3.3-4.4-7.3C7.6 5 9.2 2 12 2z" />
      <path d="M7.9 7h8.2M7.7 10.3h8.6M8.6 13.6h6.8M12 2.6v13.8" />
      <path d="M7.7 11C5 12.3 3.4 15.4 3.6 20.6c3.2-.3 6.2-1.8 8.4-4.1" />
      <path d="M16.3 11c2.7 1.3 4.3 4.4 4.1 9.6-3.2-.3-6.2-1.8-8.4-4.1" />
      <path d="M12 16.5V22" />
    </svg>
  );
}
