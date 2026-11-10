import { FooterSignatureLife } from './FooterSignatureLife';
import { LETTER_O, LETTERS_WITHOUT_O } from './footerSignatureLetters';



/**
 * The footer's signature (owner 01.11, «Підпис»): RUBIKON pressed into the charcoal band, tone on tone, the width of the
 * page. Inline, so it costs no request and stays sharp at every width. The relief is the slope of the softened letters:
 * the filter takes the shape shifted towards the light minus the shape shifted away from it, which leaves a soft light
 * edge on the sides facing the top right and a shadow on the others, and nothing on the flat faces, so the band shows
 * through whatever its colour. Decoration only, hidden from assistive technology: the name is in the logo above it.
 *
 * Owner 08.11 («Один раз і застигає»): a point light rakes the letters where a mouse moves over the footer (the lamp, a
 * specular pass of its own, faded in only while lit), and on three pages the page's scene plays once on the word and leaves
 * its trace (FooterSignatureLife.tsx, footerScenes.ts). The stage around the word holds their canvases.
 */
export function FooterSignature() {
  return (
    <div className="footer-signature-stage">
      <svg className="footer-signature" xmlns="http://www.w3.org/2000/svg" viewBox="521 140 802 79" fillRule="evenodd" aria-hidden="true" focusable="false">
        <defs>
          <filter id="footer-signature-relief" x="-1%" y="-6%" width="102%" height="112%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation=".55" result="soft" />
            <feOffset in="soft" dx=".7" dy="-.7" result="to-light" />
            <feOffset in="soft" dx="-.7" dy=".7" result="from-light" />
            <feComposite in="to-light" in2="from-light" operator="arithmetic" k2="1" k3="-1" result="lit" />
            <feComposite in="from-light" in2="to-light" operator="arithmetic" k2="1" k3="-1" result="shaded" />
            <feFlood floodColor="#F5F2EB" floodOpacity=".36" />
            <feComposite in2="lit" operator="in" result="edge-light" />
            <feFlood floodColor="#000" floodOpacity=".66" />
            <feComposite in2="shaded" operator="in" result="edge-shade" />
            <feMerge>
              <feMergeNode in="edge-shade" />
              <feMergeNode in="edge-light" />
            </feMerge>
          </filter>
          <clipPath id="footer-signature-letters">
            <path d={LETTERS_WITHOUT_O} clipRule="evenodd" />
            <path className="footer-signature-o" d={LETTER_O} clipRule="evenodd" />
          </clipPath>
          {/* The lamp: the softened letters as a height field, lit from a point the pointer (or the welding arc) moves.
              Its region is the letters and the blur's reach around them, no more: the light is kept only on the letters
              (the «in» below), and WebKit lights every pixel of the region on the CPU each time the point moves, so a
              taller region only cost time (10.11: the weld held Safari at ~190 % CPU; 180 % → 112 % of the height gives
              the same pixels). 5 % across, not less: on the O's own path 1 % is under the blur's reach and moved its sides */}
          <filter id="footer-signature-lamp-light" x="-5%" y="-6%" width="110%" height="112%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="height" />
            <feSpecularLighting in="height" surfaceScale="3.2" specularConstant="1.25" specularExponent="22" lightingColor="#F7E7D2" result="light">
              <fePointLight id="footer-signature-lamp" x="700" y="150" z="46" />
            </feSpecularLighting>
            <feComposite in="light" in2="SourceAlpha" operator="in" result="on-letters" />
            <feColorMatrix in="on-letters" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .8 0" />
          </filter>
          <linearGradient id="footer-signature-sheen-fill">
            <stop stopColor="#F5F2EB" stopOpacity="0" />
            <stop offset=".5" stopColor="#F5F2EB" stopOpacity=".5" />
            <stop offset="1" stopColor="#F5F2EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* The relief and the lamp, each in two parts: the 404 page leaves the O out (globals.css) and lowers it into place */}
        <path className="footer-signature-letters" d={LETTERS_WITHOUT_O} filter="url(#footer-signature-relief)" />
        <path className="footer-signature-letters footer-signature-o" d={LETTER_O} filter="url(#footer-signature-relief)" />
        <g className="footer-signature-lamp">
          <path d={LETTERS_WITHOUT_O} filter="url(#footer-signature-lamp-light)" />
          <path className="footer-signature-o" d={LETTER_O} filter="url(#footer-signature-lamp-light)" />
        </g>
        {/* A band of light crosses the letters once as the footer comes up (motion.css). It waits left of the word, clipped to nothing */}
        <g clipPath="url(#footer-signature-letters)">
          <rect className="footer-signature-sheen" x="281" y="140" width="240" height="79" fill="url(#footer-signature-sheen-fill)" />
        </g>
      </svg>
      <FooterSignatureLife />
    </div>
  );
}
