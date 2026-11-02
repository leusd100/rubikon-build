// The word RUBIKON from the logo's own geometry (BrandLogo.tsx), without BUILD under it
const LETTERS = 'M521 142L523 140L606 140L614 145L620 154L620 182L611 192L605 194L605 198L622 215L622 219L597 219L575 196L546 196L544 217L542 219L524 219L521 216ZM544 161L544 175L546 177L592 177L597 174L598 170L597 161L593 158L546 158ZM652 142L654 140L675 141L676 197L680 200L703 200L724 199L728 194L728 141L750 140L752 142L752 201L747 211L729 219L672 219L660 214L654 207L652 200ZM780 179L781 141L783 140L867 140L874 144L880 152L881 166L876 180L882 188L883 200L879 211L866 218L784 219L780 214ZM804 159L806 171L854 170L858 165L857 160L852 157L806 157ZM804 189L805 200L856 200L859 197L859 191L856 188L815 187ZM915 142L917 140L935 140L937 142L937 216L934 219L917 218L915 216ZM970 142L972 140L992 141L992 169L997 171L1037 140L1067 140L1066 144L1026 172L1020 177L1020 180L1065 212L1069 219L1039 219L996 187L992 189L992 217L990 219L971 218ZM1089 159L1095 146L1105 140L1176 140L1183 144L1191 155L1191 203L1187 211L1171 219L1110 219L1101 216L1092 209L1090 204ZM1112 162L1112 196L1116 200L1163 200L1168 196L1167 160L1161 158L1116 159ZM1221 141L1247 140L1297 191L1300 189L1300 141L1322 141L1323 216L1319 219L1296 219L1292 217L1251 176L1248 170L1244 169L1243 217L1240 219L1223 218L1221 216Z';

/**
 * The footer's signature (owner 01.11, «Підпис»): RUBIKON pressed into the charcoal band, tone on tone, the width of the
 * page. Inline, so it costs no request and stays sharp at every width. The relief is the slope of the softened letters:
 * the filter takes the shape shifted towards the light minus the shape shifted away from it, which leaves a soft light
 * edge on the sides facing the top right and a shadow on the others, and nothing on the flat faces, so the band shows
 * through whatever its colour. Decoration only, hidden from assistive technology: the name is in the logo above it.
 */
export function FooterSignature() {
  return (
    <svg className="footer-signature" xmlns="http://www.w3.org/2000/svg" viewBox="521 140 802 79" fillRule="evenodd" aria-hidden="true" focusable="false">
      <defs>
        <filter id="footer-signature-relief" x="-1%" y="-6%" width="102%" height="112%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="soft" />
          <feOffset in="soft" dx="1" dy="-1" result="to-light" />
          <feOffset in="soft" dx="-1" dy="1" result="from-light" />
          <feComposite in="to-light" in2="from-light" operator="arithmetic" k2="1" k3="-1" result="lit" />
          <feComposite in="from-light" in2="to-light" operator="arithmetic" k2="1" k3="-1" result="shaded" />
          <feFlood floodColor="#F5F2EB" floodOpacity=".3" />
          <feComposite in2="lit" operator="in" result="edge-light" />
          <feFlood floodColor="#000" floodOpacity=".66" />
          <feComposite in2="shaded" operator="in" result="edge-shade" />
          <feMerge>
            <feMergeNode in="edge-shade" />
            <feMergeNode in="edge-light" />
          </feMerge>
        </filter>
        <clipPath id="footer-signature-letters">
          <path d={LETTERS} clipRule="evenodd" />
        </clipPath>
        <linearGradient id="footer-signature-sheen-fill">
          <stop stopColor="#F5F2EB" stopOpacity="0" />
          <stop offset=".5" stopColor="#F5F2EB" stopOpacity=".5" />
          <stop offset="1" stopColor="#F5F2EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={LETTERS} filter="url(#footer-signature-relief)" />
      {/* A band of light crosses the letters once as the footer comes up (motion.css). It waits left of the word, clipped to nothing */}
      <g clipPath="url(#footer-signature-letters)">
        <rect className="footer-signature-sheen" x="281" y="140" width="240" height="79" fill="url(#footer-signature-sheen-fill)" />
      </g>
    </svg>
  );
}
