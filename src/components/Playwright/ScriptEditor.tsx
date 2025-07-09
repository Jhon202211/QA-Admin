export default function ScriptEditor({ script }: { script: any }) {
  return (
    <div>
      <h4>Editor de Script: {script.name}</h4>
      <ul>
        {script.steps.map((step: any, idx: number) => (
          <li key={idx}>
            {step.action} {step.target} {step.value ? `= ${step.value}` : ''}
          </li>
        ))}
      </ul>
      {/* Aquí puedes agregar inputs para editar/agregar pasos */}
    </div>
  );
} 