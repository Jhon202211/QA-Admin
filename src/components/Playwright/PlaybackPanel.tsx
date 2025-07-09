import { mockResults } from './mocks';
import { useState } from 'react';

export default function PlaybackPanel({ scriptId }: { scriptId: string }) {
  const [result, setResult] = useState<any>(null);

  const handleRun = () => {
    setResult(mockResults[scriptId as keyof typeof mockResults]);
  };

  return (
    <div>
      <button onClick={handleRun}>Ejecutar Script</button>
      {result && (
        <div>
          <p>Resultado: {result.status === 'success' ? '✅ Éxito' : '❌ Fallo'}</p>
          <pre>{result.logs}</pre>
        </div>
      )}
    </div>
  );
} 