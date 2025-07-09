import ScriptList from './ScriptList';
import ScriptEditor from './ScriptEditor';
import RecorderPanel from './RecorderPanel';
import PlaybackPanel from './PlaybackPanel';
import { useState } from 'react';

export default function PlaywrightModule() {
  const [selectedScript, setSelectedScript] = useState<any>(null);

  return (
    <div>
      <h2>Playwright: Record & Playback</h2>
      <RecorderPanel />
      <ScriptList onSelect={setSelectedScript} />
      {selectedScript && (
        <>
          <ScriptEditor script={selectedScript} />
          <PlaybackPanel scriptId={selectedScript.id} />
        </>
      )}
    </div>
  );
} 