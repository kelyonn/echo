import React from 'react';

// Convert lat/lng to fractional OSM tile coordinates at a given zoom level
function latLngToTile(lat, lng, zoom) {
  const n   = Math.pow(2, zoom);
  const x   = (lng + 180) / 360 * n;
  const rad = lat * Math.PI / 180;
  const y   = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
  return { x, y };
}

/**
 * Renders a static map using OpenStreetMap tile imagery — no iframe, no controls.
 * Fetches a 3×3 tile grid and translates it so the target lat/lng is centred.
 * Attribution must be shown by the parent: "© OpenStreetMap contributors"
 */
export default function StaticMap({ lat, lng, zoom = 14, width = 260, height = 148 }) {
  const TILE = 256;

  const { x: fx, y: fy } = latLngToTile(lat, lng, zoom);
  const cx = Math.floor(fx);
  const cy = Math.floor(fy);

  // Pixel position of lat/lng within the 3×3 tile grid (centre tile starts at TILE,TILE)
  const px = (fx - cx + 1) * TILE;
  const py = (fy - cy + 1) * TILE;

  // Translate so the point sits at the centre of our container
  const tx = Math.round(width  / 2 - px);
  const ty = Math.round(height / 2 - py);

  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({
        key: `${dx},${dy}`,
        src: `https://tile.openstreetmap.org/${zoom}/${cx + dx}/${cy + dy}.png`,
        left: (dx + 1) * TILE,
        top:  (dy + 1) * TILE,
      });
    }
  }

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: '#e8e0d8' }}>
      {/* Tile grid */}
      <div
        style={{
          position: 'absolute',
          width:  TILE * 3,
          height: TILE * 3,
          transform: `translate(${tx}px, ${ty}px)`,
        }}
      >
        {tiles.map(t => (
          <img
            key={t.key}
            src={t.src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: t.left,
              top:  t.top,
              width:  TILE,
              height: TILE,
              userSelect: 'none',
              pointerEvents: 'none',
              display: 'block',
            }}
          />
        ))}
      </div>

      {/* Pin marker centred exactly on the coordinate */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top:  '50%',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          lineHeight: 1,
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))',
        }}
      >
        <svg width="22" height="30" viewBox="0 0 22 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 0C4.925 0 0 4.925 0 11c0 7.635 11 19 11 19S22 18.635 22 11C22 4.925 17.075 0 11 0z" fill="#ef4444"/>
          <circle cx="11" cy="11" r="4.5" fill="white"/>
        </svg>
      </div>
    </div>
  );
}
