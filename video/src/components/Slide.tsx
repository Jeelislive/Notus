import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {WordReveal} from './WordReveal';
import {FeaturePill} from './FeaturePill';

export type SlideVariant = 'cover' | 'scroll' | 'contain';

interface SlideProps {
  file: string;
  label: string;
  sublabel?: string;
  variant?: SlideVariant;
  pill?: string;
  pillAccent?: string;
}

export const Slide: React.FC<SlideProps> = ({
  file,
  label,
  sublabel,
  variant = 'cover',
  pill,
  pillAccent = '#6c63ff',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  const fadeIn = Math.round(fps * 0.35);
  const fadeOut = Math.round(fps * 0.35);

  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  // Ken Burns zoom for cover slides
  const kenBurns = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Slow scroll for tall landing-page screenshot (pauses at start and end)
  const scrollY = interpolate(
    frame,
    [fps, durationInFrames - fps],
    [0, 100],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  // Gradient overlay gets richer as labels appear
  const overlayOpacity = interpolate(frame, [fadeIn, fadeIn + fps], [0.6, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const imgStyle: React.CSSProperties =
    variant === 'scroll'
      ? {width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${scrollY}%`}
      : variant === 'contain'
      ? {width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center'}
      : {width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center'};

  // Sublabel slides up after label
  const sublabelY = interpolate(frame, [fadeIn + 12, fadeIn + 28], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sublabelOpacity = interpolate(frame, [fadeIn + 12, fadeIn + 28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity, background: variant === 'contain' ? '#0d0d0d' : undefined}}>
      {/* Screenshot */}
      <AbsoluteFill
        style={{
          overflow: 'hidden',
          transform: variant === 'cover' ? `scale(${kenBurns})` : undefined,
          transformOrigin: 'center center',
        }}
      >
        <Img src={staticFile(file)} style={imgStyle} />
      </AbsoluteFill>

      {/* Bottom gradient overlay */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,${0.75 * overlayOpacity}) 0%, rgba(0,0,0,${0.22 * overlayOpacity}) 32%, transparent 58%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Feature pill — top-left */}
      {pill && (
        <AbsoluteFill style={{display: 'flex', alignItems: 'flex-start', padding: '48px 72px', pointerEvents: 'none'}}>
          <FeaturePill label={pill} accent={pillAccent} delay={fadeIn} />
        </AbsoluteFill>
      )}

      {/* Label area — bottom-left */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 80px 68px',
          pointerEvents: 'none',
          gap: 10,
        }}
      >
        <WordReveal
          text={label}
          startFrame={fadeIn}
          fontSize={48}
          fontWeight={700}
          staggerFrames={4}
        />

        {sublabel && (
          <p
            style={{
              margin: 0,
              color: 'rgba(255,255,255,0.68)',
              fontSize: 25,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              opacity: sublabelOpacity,
              transform: `translateY(${sublabelY}px)`,
            }}
          >
            {sublabel}
          </p>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
