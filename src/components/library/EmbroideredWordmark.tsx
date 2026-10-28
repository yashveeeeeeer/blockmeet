import { useId } from "react";

export default function EmbroideredWordmark() {
  const id = useId().replace(/:/g, "");
  const text = { x: 5, y: 78, fontFamily: "Georgia, serif", fontSize: 78, fontWeight: 700, textLength: 422, lengthAdjust: "spacingAndGlyphs" as const };
  return <>
    <span className="wordmark-plain">Athenaeum.</span>
    <svg className="embroidered-wordmark" viewBox="0 0 440 100" aria-hidden="true">
      <defs>
        <linearGradient id={id + "-silk"} x1="0" y1="0" x2="1" y2="0.7">
          <stop stopColor="#86cbc9" />
          <stop offset=".3" stopColor="#deb4d5" />
          <stop offset=".58" stopColor="#a4bdeb" />
          <stop offset=".8" stopColor="#e7c3d9" />
          <stop offset="1" stopColor="#8ed9d5" />
        </linearGradient>
        <pattern id={id + "-stitches"} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(-18)">
          <path d="M0 .6H4" stroke="#102f40" strokeOpacity=".65" strokeWidth=".85" />
          <path d="M0 1.7H4" stroke="#f4f6e9" strokeOpacity=".85" strokeWidth=".7" />
          <path d="M0 2.7H4" stroke="#cce9ed" strokeOpacity=".45" strokeWidth=".35" />
        </pattern>
        <filter id={id + "-relief"} x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="1.8" stdDeviation=".6" floodColor="#0b2026" floodOpacity=".85" />
        </filter>
        <linearGradient id={id + "-glint"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b4f0f2" stopOpacity=".6" />
          <stop offset=".45" stopColor="#efd3ef" stopOpacity="0" />
          <stop offset=".7" stopColor="#bad7fa" stopOpacity=".55" />
          <stop offset="1" stopColor="#f4d1ea" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g filter={`url(#${id}-relief)`}>
        <text {...text} fill={`url(#${id}-silk)`} stroke="#50697a" strokeWidth=".6" paintOrder="stroke">Athenaeum.</text>
        <text {...text} fill={`url(#${id}-stitches)`}>Athenaeum.</text>
        <text {...text} className="wordmark-glint" fill={`url(#${id}-glint)`}>Athenaeum.</text>
      </g>
    </svg>
  </>;
}
