import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Typewriter} from './Typewriter';

export const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const cardOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "Start today" slides up first
  const tagY = spring({
    frame: frame - 4,
    fps,
    config: {damping: 16, stiffness: 90},
    from: 20,
    to: 0,
  });
  const tagOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // URL types in after the tag
  const URL_START = 28;

  // Details fade in after URL finishes (~18 chars × 2fps = 36 frames → at frame 64+)
  const detailOpacity = interpolate(frame, [URL_START + 40, URL_START + 58], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const detailY = interpolate(frame, [URL_START + 40, URL_START + 58], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glowing underline under the URL
  const underlineWidth = interpolate(
    frame,
    [URL_START, URL_START + 36 + 10],
    [0, 100],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

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
      {/* Subtle radial glow behind the URL */}
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(108,99,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{textAlign: 'center', position: 'relative'}}>
        {/* "Start today" tag */}
        <p
          style={{
            margin: '0 0 18px',
            color: 'rgba(255,255,255,0.32)',
            fontSize: 16,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            transform: `translateY(${tagY}px)`,
            opacity: tagOpacity,
          }}
        >
          Start today — it&apos;s free
        </p>

        {/* URL with typewriter */}
        <div style={{position: 'relative', display: 'inline-block'}}>
          <h2
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: 72,
              fontWeight: 800,
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '-0.035em',
            }}
          >
            <Typewriter
              text="notusai.vercel.app"
              startFrame={URL_START}
              framesPerChar={2}
              color="#ffffff"
              fontSize={72}
              fontWeight={800}
              letterSpacing="-0.035em"
            />
          </h2>

          {/* Animated underline */}
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: 0,
              height: 3,
              width: `${underlineWidth}%`,
              background: 'linear-gradient(to right, #6c63ff, #a78bfa)',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Details */}
        <p
          style={{
            margin: '28px 0 0',
            color: 'rgba(255,255,255,0.38)',
            fontSize: 23,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 400,
            opacity: detailOpacity,
            transform: `translateY(${detailY}px)`,
          }}
        >
          300 minutes / month &nbsp;·&nbsp; No credit card required
        </p>
      </div>
    </AbsoluteFill>
  );
};
