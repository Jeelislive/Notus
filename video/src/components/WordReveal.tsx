import {interpolate, useCurrentFrame} from 'remotion';

interface WordRevealProps {
  text: string;
  startFrame?: number;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  staggerFrames?: number;
  letterSpacing?: string;
}

export const WordReveal: React.FC<WordRevealProps> = ({
  text,
  startFrame = 0,
  color = '#ffffff',
  fontSize = 46,
  fontWeight = 700,
  staggerFrames = 4,
  letterSpacing = '-0.025em',
}) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');

  return (
    <span style={{display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.22em'}}>
      {words.map((word, i) => {
        const localFrame = frame - startFrame - i * staggerFrames;
        const opacity = interpolate(localFrame, [0, 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = interpolate(localFrame, [0, 14], [18, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <span
            key={i}
            style={{
              color,
              fontSize,
              fontWeight,
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing,
              lineHeight: 1.1,
              display: 'inline-block',
              opacity,
              transform: `translateY(${y}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
};
