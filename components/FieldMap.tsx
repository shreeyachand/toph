/**
 * Self-contained satellite-style field map (no tile network calls).
 * Mosaic of farm parcels with one highlighted field + GPS pin.
 */
export default function FieldMap() {
  return (
    <svg
      viewBox="0 0 600 340"
      className="h-auto w-full rounded-xl border border-[#ececec]"
      role="img"
      aria-label="Satellite map of field"
    >
      <defs>
        <clipPath id="mapClip">
          <rect width="600" height="340" rx="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#mapClip)">
        {/* base */}
        <rect width="600" height="340" fill="#5d6b4a" />
        {/* parcel mosaic */}
        <rect x="0" y="0" width="150" height="170" fill="#3f5238" />
        <rect x="150" y="0" width="130" height="110" fill="#1e4d4f" />
        <rect x="150" y="110" width="130" height="60" fill="#2e5f54" />
        <rect x="280" y="0" width="170" height="170" fill="#164e4a" />
        <rect x="280" y="60" width="90" height="70" fill="#1d5a5e" />
        <rect x="450" y="0" width="150" height="170" fill="#8a7a4d" />
        <rect x="450" y="0" width="150" height="60" fill="#6b5f3c" />
        <rect x="450" y="60" width="75" height="110" fill="#a08c52" />
        <rect x="525" y="60" width="75" height="110" fill="#7d8b5a" />
        <rect x="0" y="170" width="150" height="170" fill="#7c8a52" />
        <circle cx="70" cy="250" r="52" fill="#6f7f49" />
        <rect x="150" y="170" width="130" height="170" fill="#9a8f56" />
        <rect x="150" y="230" width="130" height="50" fill="#8a7f4c" />
        <rect x="280" y="170" width="170" height="170" fill="#4d5a37" />
        <rect x="280" y="170" width="85" height="170" fill="#a39058" />
        <rect x="365" y="170" width="85" height="85" fill="#3a3a30" />
        <rect x="365" y="255" width="85" height="85" fill="#2f2f28" />
        <rect x="450" y="170" width="150" height="170" fill="#8fa060" />
        {/* texture noise */}
        {Array.from({ length: 260 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 53) % 600}
            cy={(i * 91) % 340}
            r={(i % 5) * 1.1 + 0.6}
            fill={i % 3 === 0 ? "#00000022" : "#ffffff18"}
          />
        ))}
        {/* roads */}
        <rect x="0" y="164" width="600" height="7" fill="#c9c2ae" />
        <rect x="444" y="0" width="7" height="340" fill="#c9c2ae" />
        <rect x="274" y="0" width="4" height="340" fill="#b7b09a" opacity="0.8" />
        {/* water shimmer */}
        <ellipse cx="350" cy="70" rx="60" ry="34" fill="#2a7d8c" opacity="0.55" />
        {/* highlighted field */}
        <rect
          x="352"
          y="148"
          width="86"
          height="72"
          rx="8"
          fill="#c98f4e"
          fillOpacity="0.55"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />
        {/* GPS pin */}
        <circle cx="398" cy="186" r="11" fill="#3b82f6" opacity="0.25" />
        <circle cx="398" cy="186" r="7" fill="#2f9df0" stroke="#fff" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
