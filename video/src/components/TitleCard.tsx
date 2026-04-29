import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Typewriter} from './Typewriter';

const TITLE = 'Notus';

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const cardOpacity = interpolate(
    frame,
    [0, 10, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  // Dot pulses before title appears
  const dotScale = spring({
    frame,
    fps,
    config: {damping: 10, stiffness: 160},
    from: 0,
    to: 1,
  });

  return (
    <AbsoluteFill
      style={{
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: cardOpacity,
      }}
    >
      {/* Animated logo dot */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#6c63ff',
          marginBottom: 30,
          transform: `scale(${dotScale})`,
          boxShadow: `0 0 ${20 * dotScale}px ${10 * dotScale}px rgba(108,99,255,0.3)`,
        }}
      />

      {/* Title — each character springs in with stagger */}
      <div style={{display: 'flex', alignItems: 'baseline', gap: 0}}>
        {TITLE.split('').map((char, i) => {
          const charY = spring({
            frame: frame - i * 3,
            fps,
            config: {damping: 16, stiffness: 100, mass: 0.6},
            from: 48,
            to: 0,
          });
          const charOpacity = interpolate(frame - i * 3, [0, 12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <span
              key={i}
              style={{
                color: '#ffffff',
                fontSize: 110,
                fontWeight: 800,
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '-0.045em',
                lineHeight: 1,
                display: 'inline-block',
                transform: `translateY(${charY}px)`,
                opacity: charOpacity,
              }}
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Subtitle — typewriter after title settles */}
      <div style={{marginTop: 22}}>
        <Typewriter
          text="AI-powered meeting notes"
          startFrame={28}
          framesPerChar={3}
          color="rgba(255,255,255,0.42)"
          fontSize={28}
          fontWeight={400}
          letterSpacing="-0.01em"
        />
      </div>

      {/* Footer tag */}
      <div
        style={{
          position: 'absolute',
          bottom: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: interpolate(frame, [60, 80], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{width: 24, height: 1, background: 'rgba(255,255,255,0.2)'}} />
        <span
          style={{
            color: 'rgba(255,255,255,0.22)',
            fontSize: 15,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Product Tour
        </span>
        <div style={{width: 24, height: 1, background: 'rgba(255,255,255,0.2)'}} />
      </div>
    </AbsoluteFill>
  );
};
