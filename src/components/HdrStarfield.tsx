const FEATURE_STARS = [
  { x: 7, y: 13, size: 7, delay: -1.2, duration: 4.7 },
  { x: 18, y: 7, size: 5, delay: -3.4, duration: 5.6 },
  { x: 29, y: 21, size: 9, delay: -0.8, duration: 6.2 },
  { x: 41, y: 11, size: 5, delay: -4.1, duration: 5.1 },
  { x: 53, y: 27, size: 7, delay: -2.6, duration: 6.8 },
  { x: 64, y: 8, size: 9, delay: -5.2, duration: 7.1 },
  { x: 75, y: 19, size: 5, delay: -1.9, duration: 5.8 },
  { x: 87, y: 10, size: 7, delay: -4.7, duration: 6.4 },
  { x: 94, y: 31, size: 5, delay: -0.4, duration: 5.3 },
] as const;

export default function HdrStarfield() {
  return (
    <div className="hdr-starfield" aria-hidden="true">
      {FEATURE_STARS.map((star) => (
        <span
          key={`${star.x}-${star.y}`}
          className="hdr-star"
          style={
            {
              "--star-x": `${star.x}%`,
              "--star-y": `${star.y}%`,
              "--star-size": `${star.size}px`,
              "--star-delay": `${star.delay}s`,
              "--star-duration": `${star.duration}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
