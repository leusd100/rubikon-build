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
      {/* the ear, its rows of kernels, the two husk leaves and the stalk */}
      <path d="M12 2.5c2.3 0 3.6 2.8 3.6 6.8 0 3.6-1.5 6.7-3.6 6.7s-3.6-3.1-3.6-6.7c0-4 1.3-6.8 3.6-6.8z" />
      <path d="M8.6 7.5h6.8M8.4 10.5h7.2M9 13.5h6M12 3v12.5" />
      <path d="M8.6 10.8C6.3 12 5.2 14.8 5.6 19.5c2.6-.4 4.8-1.6 6.4-3.5" />
      <path d="M15.4 10.8c2.3 1.2 3.4 4 3 8.7-2.6-.4-4.8-1.6-6.4-3.5" />
      <path d="M12 16v5.5" />
    </svg>
  );
}
