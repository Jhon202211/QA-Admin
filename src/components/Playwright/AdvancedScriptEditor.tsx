import { useState, useEffect } from 'react';
import playwrightScriptsService from '../../firebase/playwrightScripts';
import type { PlaywrightScript, PlaywrightStep } from '../../types/playwrightScript';

interface AdvancedScriptEditorProps {
  script?: PlaywrightScript;
  onSave?: (script: PlaywrightScript) => void;
  onExecute?: (script: PlaywrightScript) => void;
}

const ACTION_TYPES = [
  { value: 'goto', label: 'Navegar a URL', icon: '🌐' },
  { value: 'click', label: 'Hacer clic', icon: '🖱️' },
  { value: 'fill', label: 'Llenar campo', icon: '📝' },
  { value: 'type', label: 'Escribir texto', icon: '⌨️' },
  { value: 'select', label: 'Seleccionar opción', icon: '📋' },
  { value: 'wait', label: 'Esperar', icon: '⏱️' },
  { value: 'screenshot', label: 'Capturar pantalla', icon: '📸' },
  { value: 'hover', label: 'Pasar mouse', icon: '🖱️' }
];

export default function AdvancedScriptEditor({ script, onSave, onExecute }: AdvancedScriptEditorProps) {
  const [currentScript, setCurrentScript] = useState<PlaywrightScript>({
    id: '',
    name: '',
    description: '',
    url: '',
    steps: [],
    tags: [],
    createdAt: '',
    updatedAt: '',
    createdBy: 'user',
    isPublic: false,
    executionCount: 0,
    status: 'draft'
  });

  const [editingStep, setEditingStep] = useState<PlaywrightStep | null>(null);
  const [showStepForm, setShowStepForm] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    if (script) {
      setCurrentScript(script);
    }
  }, [script]);

  const handleScriptChange = (field: keyof PlaywrightScript, value: any) => {
    setCurrentScript(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addStep = () => {
    const newStep: PlaywrightStep = {
      id: Date.now().toString(),
      action: 'click',
      target: '',
      value: '',
      description: '',
      order: currentScript.steps.length
    };
    setEditingStep(newStep);
    setShowStepForm(true);
  };

  const editStep = (step: PlaywrightStep) => {
    setEditingStep(step);
    setShowStepForm(true);
  };

  const saveStep = () => {
    if (!editingStep) return;

    if (editingStep.id && currentScript.steps.find(s => s.id === editingStep.id)) {
      // Actualizar paso existente
      setCurrentScript(prev => ({
        ...prev,
        steps: prev.steps.map(s => s.id === editingStep.id ? editingStep : s)
      }));
    } else {
      // Agregar nuevo paso
      const newStep = { ...editingStep, id: Date.now().toString() };
      setCurrentScript(prev => ({
        ...prev,
        steps: [...prev.steps, newStep]
      }));
    }

    setEditingStep(null);
    setShowStepForm(false);
  };

  const deleteStep = (stepId: string) => {
    setCurrentScript(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId)
    }));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    setCurrentScript(prev => {
      const steps = [...prev.steps];
      const index = steps.findIndex(s => s.id === stepId);
      
      if (direction === 'up' && index > 0) {
        [steps[index], steps[index - 1]] = [steps[index - 1], steps[index]];
      } else if (direction === 'down' && index < steps.length - 1) {
        [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
      }

      return { ...prev, steps };
    });
  };

  const handleSave = async () => {
    try {
      if (currentScript.id) {
        await playwrightScriptsService.updateScript(currentScript.id, currentScript);
      } else {
        const newId = await playwrightScriptsService.createScript(currentScript);
        setCurrentScript(prev => ({ ...prev, id: newId }));
      }
      
      onSave?.(currentScript);
      alert('✅ Script guardado exitosamente');
    } catch (error) {
      console.error('Error guardando script:', error);
      alert('❌ Error guardando script');
    }
  };

  const generateCode = () => {
    const code = playwrightScriptsService.generatePlaywrightCode(currentScript);
    setGeneratedCode(code);
  };

  const addTag = (tag: string) => {
    if (tag && !currentScript.tags.includes(tag)) {
      setCurrentScript(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentScript(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="advanced-script-editor">
      <div className="editor-header">
        <h2>✏️ Editor Avanzado de Scripts</h2>
        <div className="header-actions">
          <button onClick={generateCode} className="btn-generate">
            🔧 Generar Código
          </button>
          <button onClick={handleSave} className="btn-save">
            💾 Guardar
          </button>
          <button onClick={() => onExecute?.(currentScript)} className="btn-execute">
            ▶️ Ejecutar
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="script-info">
          <div className="form-group">
            <label>Nombre del Script:</label>
            <input
              type="text"
              value={currentScript.name}
              onChange={(e) => handleScriptChange('name', e.target.value)}
              placeholder="Ej: Login Test"
            />
          </div>

          <div className="form-group">
            <label>Descripción:</label>
            <textarea
              value={currentScript.description}
              onChange={(e) => handleScriptChange('description', e.target.value)}
              placeholder="Describe qué hace este script..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>URL Base:</label>
            <input
              type="url"
              value={currentScript.url}
              onChange={(e) => handleScriptChange('url', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label>Tags:</label>
            <div className="tags-input">
              <input
                type="text"
                placeholder="Agregar tag..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="current-tags">
                {currentScript.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                    <button onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Estado:</label>
            <select
              value={currentScript.status}
              onChange={(e) => handleScriptChange('status', e.target.value)}
            >
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
        </div>

        <div className="steps-section">
          <div className="steps-header">
            <h3>📋 Pasos del Script ({currentScript.steps.length})</h3>
            <button onClick={addStep} className="btn-add-step">
              ➕ Agregar Paso
            </button>
          </div>

          <div className="steps-list">
            {currentScript.steps.map((step, index) => (
              <div key={step.id} className="step-item">
                <div className="step-info">
                  <span className="step-number">{index + 1}</span>
                  <div className="step-details">
                    <div className="step-action">
                      {ACTION_TYPES.find(a => a.value === step.action)?.icon} {step.action}
                    </div>
                    <div className="step-target">{step.target}</div>
                    {step.value && <div className="step-value">{step.value}</div>}
                  </div>
                </div>
                <div className="step-actions">
                  <button onClick={() => moveStep(step.id, 'up')} disabled={index === 0}>
                    ⬆️
                  </button>
                  <button onClick={() => moveStep(step.id, 'down')} disabled={index === currentScript.steps.length - 1}>
                    ⬇️
                  </button>
                  <button onClick={() => editStep(step)}>✏️</button>
                  <button onClick={() => deleteStep(step.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {generatedCode && (
          <div className="generated-code">
            <h3>🔧 Código Generado</h3>
            <pre>{generatedCode}</pre>
            <button onClick={() => navigator.clipboard.writeText(generatedCode)}>
              📋 Copiar Código
            </button>
          </div>
        )}
      </div>

      {showStepForm && (
        <div className="step-form-modal">
          <div className="modal-content">
            <h3>{editingStep?.id ? 'Editar Paso' : 'Nuevo Paso'}</h3>
            
            <div className="form-group">
              <label>Acción:</label>
              <select
                value={editingStep?.action}
                onChange={(e) => setEditingStep(prev => prev ? { ...prev, action: e.target.value as any } : null)}
              >
                {ACTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Selector/URL:</label>
              <input
                type="text"
                value={editingStep?.target}
                onChange={(e) => setEditingStep(prev => prev ? { ...prev, target: e.target.value } : null)}
                placeholder={editingStep?.action === 'goto' ? 'https://example.com' : 'button#login'}
              />
            </div>

            {(editingStep?.action === 'fill' || editingStep?.action === 'type' || editingStep?.action === 'select' || editingStep?.action === 'wait') && (
              <div className="form-group">
                <label>Valor:</label>
                <input
                  type="text"
                  value={editingStep?.value}
                  onChange={(e) => setEditingStep(prev => prev ? { ...prev, value: e.target.value } : null)}
                  placeholder={editingStep?.action === 'wait' ? '1000' : 'valor'}
                />
              </div>
            )}

            <div className="form-group">
              <label>Descripción:</label>
              <input
                type="text"
                value={editingStep?.description}
                onChange={(e) => setEditingStep(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Descripción opcional del paso"
              />
            </div>

            <div className="modal-actions">
              <button onClick={saveStep} className="btn-save">💾 Guardar</button>
              <button onClick={() => setShowStepForm(false)} className="btn-cancel">❌ Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .advanced-script-editor {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .editor-header h2 {
          margin: 0;
          color: #2c3e50;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn-generate, .btn-save, .btn-execute {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .btn-generate {
          background: #9b59b6;
          color: white;
        }

        .btn-generate:hover {
          background: #8e44ad;
        }

        .btn-save {
          background: #27ae60;
          color: white;
        }

        .btn-save:hover {
          background: #229954;
        }

        .btn-execute {
          background: #e74c3c;
          color: white;
        }

        .btn-execute:hover {
          background: #c0392b;
        }

        .editor-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .script-info {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3498db;
        }

        .tags-input input {
          margin-bottom: 10px;
        }

        .current-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag {
          background: #3498db;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tag button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          margin-left: 4px;
        }

        .steps-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .steps-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .steps-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .btn-add-step {
          padding: 8px 16px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-add-step:hover {
          background: #2980b9;
        }

        .steps-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .step-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 8px;
          background: #f8f9fa;
        }

        .step-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .step-number {
          background: #3498db;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .step-details {
          flex: 1;
        }

        .step-action {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .step-target {
          font-size: 12px;
          color: #7f8c8d;
          font-family: monospace;
        }

        .step-value {
          font-size: 12px;
          color: #27ae60;
          font-style: italic;
        }

        .step-actions {
          display: flex;
          gap: 4px;
        }

        .step-actions button {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #ecf0f1;
          color: #2c3e50;
        }

        .step-actions button:hover:not(:disabled) {
          background: #d5dbdb;
        }

        .step-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generated-code {
          grid-column: 1 / -1;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-top: 20px;
        }

        .generated-code h3 {
          margin-bottom: 15px;
          color: #2c3e50;
        }

        .generated-code pre {
          background: #2c3e50;
          color: #ecf0f1;
          padding: 15px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 12px;
          line-height: 1.4;
        }

        .generated-code button {
          margin-top: 10px;
          padding: 8px 16px;
          background: #9b59b6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .step-form-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          min-width: 400px;
          max-width: 500px;
        }

        .modal-content h3 {
          margin-bottom: 20px;
          color: #2c3e50;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .btn-cancel {
          padding: 10px 16px;
          background: #95a5a6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-cancel:hover {
          background: #7f8c8d;
        }
      `}</style>
    </div>
  );
} 