import {useCurrentFrame} from 'remotion';

interface TypewriterProps {
  text: string;
  startFrame?: number;
  framesPerChar?: number;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  startFrame = 0,
  framesPerChar = 2,
  color = 'rgba(255,255,255,0.38)',
  fontSize = 23,
  fontWeight = 400,
  letterSpacing = '-0.01em',
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const charsToShow = Math.floor(localFrame / framesPerChar);
  const visibleText = text.slice(0, Math.max(0, charsToShow));

  // Blinking cursor — toggle every 10 frames
  const cursorOpacity = charsToShow < text.length ? (Math.floor(localFrame / 10) % 2 === 0 ? 1 : 0) : 0;

  return (
    <span
      style={{
        color,
        fontSize,
        fontWeight,
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing,
      }}
    >
      {visibleText}
      <span style={{opacity: cursorOpacity, color: '#6c63ff'}}>|</span>
    </span>
  );
};
