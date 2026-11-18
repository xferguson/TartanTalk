// Same geometry as drawMoth in src/weave/draw.ts, as SVG for use outside the cloth.
const BODY = '#5b4a3d';

interface Props {
  size: number;
  /** Radians. */
  rotate?: number;
}

export function MothSprite({ size, rotate = 0 }: Props) {
  const sw = Math.max(1 / size, 0.05);
  const deg = (rotate * 180) / Math.PI;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-0.6 -0.6 1.2 1.2"
      role="img"
      aria-label="Moth"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      {[-1, 1].map((sd) => (
        <g key={sd}>
          <path
            d={`M ${sd * 0.08} -0.28 Q ${sd * 0.2} -0.55 ${sd * 0.32} -0.52`}
            stroke={BODY}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx={sd * 0.3} cy={-0.02} rx={0.32} ry={0.24} transform={`rotate(${sd * -0.5 * (180 / Math.PI)} ${sd * 0.3} -0.02)`} fill="var(--moth)" />
          <ellipse cx={sd * 0.24} cy={0.2} rx={0.2} ry={0.15} transform={`rotate(${sd * 0.6 * (180 / Math.PI)} ${sd * 0.24} 0.2)`} fill="var(--moth)" />
        </g>
      ))}
      <ellipse cx={0} cy={0} rx={0.12} ry={0.3} fill={BODY} />
      {[-1, 1].map((sd) => (
        <g key={`e${sd}`}>
          <circle cx={sd * 0.06} cy={-0.2} r={0.055} fill="#fff" />
          <circle cx={sd * 0.06} cy={-0.19} r={0.028} fill="#1a1410" />
        </g>
      ))}
    </svg>
  );
}
