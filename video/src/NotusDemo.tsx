import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {Slide, SlideVariant} from './components/Slide';
import {TitleCard} from './components/TitleCard';
import {OutroCard} from './components/OutroCard';

const FPS = 30;
const TITLE_DURATION = 5 * FPS;  //  5s
const OUTRO_DURATION = 9 * FPS;  //  9s

interface SlideConfig {
  file: string;
  label: string;
  sublabel?: string;
  duration: number;
  variant?: SlideVariant;
  pill?: string;
  pillAccent?: string;
}

// Total slide time = 16+12+8+8+13+14+11+11+10+8 = 111s → grand total 5+111+9 = 125s ≈ 2 min
const SLIDES: SlideConfig[] = [
  {
    file: 'screencapture-notusai-vercel-app-2026-04-07-22_36_38.png',
    label: 'Landing Page',
    sublabel: 'The AI notepad for back-to-back meetings',
    duration: 16 * FPS,
    variant: 'scroll',
    pill: 'notusai.vercel.app',
    pillAccent: '#6c63ff',
  },
  {
    file: 'Screenshot from 2026-04-07 22-38-43.png',
    label: 'Meetings Dashboard',
    sublabel: 'All your recordings, sorted and searchable',
    duration: 12 * FPS,
    variant: 'cover',
    pill: 'Dashboard',
    pillAccent: '#10b981',
  },
  {
    file: 'Screenshot from 2026-04-07 22-39-06.png',
    label: 'Create a Meeting',
    sublabel: 'Name it, choose the type',
    duration: 8 * FPS,
    variant: 'contain',
    pill: 'New Meeting',
    pillAccent: '#6c63ff',
  },
  {
    file: 'Screenshot from 2026-04-07 22-39-16.png',
    label: 'Choose a Template',
    sublabel: '1-on-1 · User Interview · Sales Call · Daily Standup',
    duration: 8 * FPS,
    variant: 'contain',
    pill: 'Templates',
    pillAccent: '#f59e0b',
  },
  {
    file: 'Screenshot from 2026-04-07 22-43-53.png',
    label: 'Live Recording',
    sublabel: 'Real-time transcription with speaker labels',
    duration: 13 * FPS,
    variant: 'cover',
    pill: 'Recording',
    pillAccent: '#ef4444',
  },
  {
    file: 'Screenshot from 2026-04-07 22-44-10.png',
    label: 'AI Summary',
    sublabel: 'Overview · Open Questions · Key Quotes — auto-generated',
    duration: 14 * FPS,
    variant: 'cover',
    pill: 'AI Summary',
    pillAccent: '#6c63ff',
  },
  {
    file: 'Screenshot from 2026-04-07 22-44-50.png',
    label: 'Notes Editor',
    sublabel: 'AI-filled structured notes, fully editable',
    duration: 11 * FPS,
    variant: 'cover',
    pill: 'Notes',
    pillAccent: '#10b981',
  },
  {
    file: 'Screenshot from 2026-04-07 22-45-59.png',
    label: 'Ask Notus',
    sublabel: 'Chat with your meeting — instant contextual answers',
    duration: 11 * FPS,
    variant: 'cover',
    pill: 'AI Chat',
    pillAccent: '#a78bfa',
  },
  {
    file: 'Screenshot from 2026-04-07 22-46-08.png',
    label: 'Integrations',
    sublabel: 'Jira · Slack · Notion · Linear · GitHub',
    duration: 10 * FPS,
    variant: 'cover',
    pill: 'Integrations',
    pillAccent: '#f59e0b',
  },
  {
    file: 'Screenshot from 2026-04-07 22-46-44.png',
    label: 'Push to Jira',
    sublabel: 'Action items become Jira tasks in one click',
    duration: 8 * FPS,
    variant: 'contain',
    pill: 'Jira Sync',
    pillAccent: '#3b82f6',
  },
];

const sequenced = (() => {
  let cursor = TITLE_DURATION;
  return SLIDES.map((s) => {
    const from = cursor;
    cursor += s.duration;
    return {...s, from};
  });
})();

const SLIDES_TOTAL = SLIDES.reduce((acc, s) => acc + s.duration, 0);
export const TOTAL_FRAMES = TITLE_DURATION + SLIDES_TOTAL + OUTRO_DURATION;

// Thin progress bar — runs across the full composition timeline
const ProgressBar: React.FC<{total: number}> = ({total}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* Track */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.08)',
          opacity,
        }}
      />
      {/* Fill */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${progress}%`,
          height: 3,
          background: 'linear-gradient(to right, #6c63ff, #a78bfa)',
          opacity,
          borderRadius: '0 2px 0 0',
        }}
      />
    </AbsoluteFill>
  );
};

export const NotusDemo: React.FC = () => {
  const outroFrom = TITLE_DURATION + SLIDES_TOTAL;

  return (
    <AbsoluteFill style={{background: '#000000'}}>
      {/* Intro */}
      <Sequence from={0} durationInFrames={TITLE_DURATION}>
        <TitleCard />
      </Sequence>

      {/* Page slides */}
      {sequenced.map((slide, i) => (
        <Sequence key={i} from={slide.from} durationInFrames={slide.duration}>
          <Slide
            file={slide.file}
            label={slide.label}
            sublabel={slide.sublabel}
            variant={slide.variant}
            pill={slide.pill}
            pillAccent={slide.pillAccent}
          />
        </Sequence>
      ))}

      {/* Outro CTA */}
      <Sequence from={outroFrom} durationInFrames={OUTRO_DURATION}>
        <OutroCard />
      </Sequence>

      {/* Global progress bar — always on top */}
      <ProgressBar total={TOTAL_FRAMES} />
    </AbsoluteFill>
  );
};
