import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

interface FeaturePillProps {
  label: string;
  delay?: number;
  accent?: string;
}

export const FeaturePill: React.FC<FeaturePillProps> = ({
  label,
  delay = 0,
  accent = '#6c63ff',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const localFrame = frame - delay;

  const scale = spring({
    frame: localFrame,
    fps,
    config: {damping: 13, stiffness: 200, mass: 0.6},
    from: 0,
    to: 1,
  });

  const opacity = interpolate(localFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (localFrame < 0) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 18px',
        borderRadius: 100,
        background: `${accent}22`,
        border: `1.5px solid ${accent}66`,
        color: accent,
        fontSize: 17,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        transform: `scale(${scale})`,
        transformOrigin: 'left center',
        opacity,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: accent,
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
};
