// City coordinates derived from real geographic data (lon/lat → SVG via Mercator projection)
const CITY_COORDS = {
  'hamburg': { x: 101.8, y: 72.3 },
  'berlin': { x: 157.3, y: 99.1 },
  'münchen': { x: 127.6, y: 213.2 },
  'munich': { x: 127.6, y: 213.2 },
  'frankfurt': { x: 80.2, y: 161.9 },
  'frankfurt am main': { x: 80.2, y: 161.9 },
  'köln': { x: 52.1, y: 140.3 },
  'cologne': { x: 52.1, y: 140.3 },
  'stuttgart': { x: 88.4, y: 196.5 },
  'düsseldorf': { x: 49, y: 132.7 },
  'dortmund': { x: 60.5, y: 125.4 },
  'essen': { x: 52.9, y: 126.7 },
  'leipzig': { x: 140.5, y: 129.9 },
  'bremen': { x: 82.2, y: 84.6 },
  'dresden': { x: 162.9, y: 137.4 },
  'hannover': { x: 97.4, y: 103 },
  'nürnberg': { x: 119.4, y: 179.1 },
  'nuremberg': { x: 119.4, y: 179.1 },
  'duisburg': { x: 48.9, y: 127.5 },
  'bochum': { x: 56.4, y: 126.2 },
  'wuppertal': { x: 55.7, y: 131.7 },
  'bielefeld': { x: 77.8, y: 112.2 },
  'bonn': { x: 54.4, y: 145.7 },
  'münster': { x: 63.1, y: 113.7 },
  'karlsruhe': { x: 75.6, y: 190.5 },
  'mannheim': { x: 76.8, y: 178 },
  'augsburg': { x: 116.5, y: 207.2 },
  'wiesbaden': { x: 73, y: 162.7 },
  'mainz': { x: 73.5, y: 164.8 },
  'aachen': { x: 37.7, y: 144.4 },
  'braunschweig': { x: 110.4, y: 105.9 },
  'kiel': { x: 104.1, y: 52.3 },
  'lübeck': { x: 113.1, y: 64 },
  'rostock': { x: 136.1, y: 58.3 },
  'freiburg': { x: 66.7, y: 217.1 },
  'ulm': { x: 101.6, y: 206.4 },
  'regensburg': { x: 136.1, y: 190.3 },
  'heidelberg': { x: 80.4, y: 180.1 },
  'darmstadt': { x: 79.7, y: 168.1 },
  'potsdam': { x: 151.9, y: 102.3 },
  'wolfsburg': { x: 114.5, y: 101.7 },
  'ingolstadt': { x: 125, y: 196.8 },
  'würzburg': { x: 100.6, y: 170.2 },
  'saarbrücken': { x: 52.6, y: 184.8 },
  'magdeburg': { x: 128.4, y: 109.3 },
  'erfurt': { x: 118.6, y: 139.2 },
  'kassel': { x: 93.6, y: 130.6 },
  'konstanz': { x: 88.4, y: 225.7 },
  'passau': { x: 158.5, y: 202 },
  'trier': { x: 46.9, y: 171 },
  'chemnitz': { x: 149.5, y: 143.1 },
  'schwerin': { x: 125, y: 70.2 },
  'oldenburg': { x: 72.5, y: 83 },
  'osnabrück': { x: 69.9, y: 105.4 },
  'göttingen': { x: 100.6, y: 124.9 },
  'paderborn': { x: 81.4, y: 120 },
  'siegen': { x: 69.4, y: 142.1 },
  'cottbus': { x: 172.5, y: 118.9 },
  'jena': { x: 127.8, y: 140.5 },
  'gera': { x: 135.8, y: 141.8 },
  'pforzheim': { x: 80.5, y: 193.7 },
  'offenbach': { x: 81.7, y: 162.2 },
  'ludwigshafen': { x: 76.1, y: 178.3 },
  'heilbronn': { x: 89, y: 187.2 },
  'bremerhaven': { x: 78.6, y: 72.6 },
  'halle': { x: 134, y: 126.2 },
  'coburg': { x: 117.5, y: 158 },
  'bayreuth': { x: 127.6, y: 166.1 },
  'bamberg': { x: 116.3, y: 167.6 },
};

function getCityPosition(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return CITY_COORDS[key] || null;
}

// Germany outline from Natural Earth GeoJSON, Mercator-projected and bezier-smoothed
const GERMANY_PATH =
  'M100.5,35 Q100.8,45.1 117.3,51.1 Q117.1,60.4 133.7,55.5 ' +
  'Q142.9,48.4 161.4,58.6 Q169.1,66.9 172.9,80.2 Q168.3,87.1 174.3,96.4 ' +
  'Q178.3,110.3 177.1,119.3 Q183.7,135.9 176.5,138.7 Q172.1,135.7 168.1,140.6 ' +
  'Q156.3,145.7 150.3,152.2 Q138.4,157.8 141.2,165.6 Q143,176.5 151.3,182.8 ' +
  'Q160.5,194 154.8,206 Q148.9,209.3 151.2,226.3 Q149.7,230.7 144.6,225.4 ' +
  'Q136.8,224.6 125.1,229.2 Q110.7,228.1 108.4,235 Q100.1,227.8 95.2,229.2 ' +
  'Q77.6,221.2 74.3,226.9 Q60.4,226.7 62.5,208.2 Q70.7,190.3 47.2,185.5 ' +
  'Q39.5,178.7 40.4,167.3 Q37.1,161.4 39,143.8 Q36.3,116.5 46.1,116.5 ' +
  'Q50.2,106.7 54.3,82.9 Q51.2,74.1 54.4,68.6 Q68.1,67.2 71.1,72.9 ' +
  'Q82.2,60.1 78.5,50.3 Q77.7,35.5 90.1,39 Z';

const MARKER_COLOR = '#2c6e72';
const STROKE_COLOR = '#9ca3b0';

export default function GermanyMap({ city, size = 'md', className = '' }) {
  const pos = getCityPosition(city);

  const sizeMap = {
    sm: { w: 52, h: 72 },
    md: { w: 90, h: 125 },
    lg: { w: 135, h: 188 },
  };
  const { w, h } = sizeMap[size] || sizeMap.md;

  // Only show label line + text for md and lg sizes
  const showLabel = size !== 'sm' && pos && city;

  // Calculate label position — always above the map outline (map top ≈ y:35)
  let anchorX = 0, anchorY = 0, textX = 0, ulX1 = 0, ulX2 = 0;
  if (showLabel) {
    const charWidth = 10;
    const textWidth = city.length * charWidth;

    // Anchor Y: above the map, capped between -5 and 25
    anchorY = Math.min(pos.y - 45, 25);
    anchorY = Math.max(anchorY, -5);

    // Text positioned slightly right of the dot's x, clamped to viewBox
    textX = Math.min(pos.x + 8, 210 - textWidth);
    textX = Math.max(5, textX);
    ulX1 = textX;
    ulX2 = textX + textWidth;
    // Line connects to the left end of the underline
    anchorX = ulX1;
  }

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg
        viewBox="-5 -15 225 260"
        width={w}
        height={h}
        className="shrink-0"
      >
        {/* Germany outline — transparent fill, thin gray stroke matching reference */}
        <path
          d={GERMANY_PATH}
          fill="none"
          stroke={STROKE_COLOR}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* City marker */}
        {pos && (
          <>
            {/* Filled dot */}
            <circle cx={pos.x} cy={pos.y} r="5.5" fill={MARKER_COLOR} />

            {showLabel && (
              <>
                {/* Diagonal line from dot to label anchor */}
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={anchorX}
                  y2={anchorY}
                  stroke={MARKER_COLOR}
                  strokeWidth="1.2"
                />
                {/* Horizontal underline beneath city name */}
                <line
                  x1={ulX1}
                  y1={anchorY}
                  x2={ulX2}
                  y2={anchorY}
                  stroke={MARKER_COLOR}
                  strokeWidth="1.2"
                />
                {/* City name — foreignObject for guaranteed umlaut (Ü,Ö,Ä) rendering */}
                <foreignObject
                  x={textX}
                  y={anchorY - 22}
                  width={city.length * 12 + 10}
                  height="24"
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      color: '#3d5a6e',
                      fontSize: '17px',
                      fontWeight: 600,
                      fontFamily: "'DM Sans', Arial, Helvetica, sans-serif",
                      lineHeight: '24px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {city}
                  </div>
                </foreignObject>
              </>
            )}
          </>
        )}
      </svg>

      {/* Small label below map for sm size only */}
      {size === 'sm' && city && (
        <span
          className="font-medium text-gray-500 mt-0.5 truncate text-center"
          style={{
            maxWidth: 52,
            fontSize: 11,
            lineHeight: 1.2,
          }}
        >
          {city}
        </span>
      )}
    </div>
  );
}
