import {Composition} from 'remotion';
import {NotusDemo, TOTAL_FRAMES} from './NotusDemo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NotusDemo"
    component={NotusDemo}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
);
