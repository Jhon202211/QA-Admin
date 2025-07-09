import { mockScripts } from './mocks';

export default function ScriptList({ onSelect }: { onSelect: (script: any) => void }) {
  return (
    <div>
      <h3>Scripts grabados</h3>
      <ul>
        {mockScripts.map(script => (
          <li key={script.id}>
            <button onClick={() => onSelect(script)}>
              {script.name} ({new Date(script.createdAt).toLocaleString()})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 