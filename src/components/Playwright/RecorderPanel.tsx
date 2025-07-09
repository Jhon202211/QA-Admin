import { useState } from 'react';

export default function RecorderPanel() {
  const [recording, setRecording] = useState(false);

  return (
    <div>
      <button onClick={() => setRecording(r => !r)}>
        {recording ? 'Detener grabación' : 'Iniciar grabación'}
      </button>
      {recording && <p>Grabando acciones... (simulado)</p>}
    </div>
  );
} 