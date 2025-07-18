import { useState, useEffect } from 'react';
import ScriptsList from './ScriptsList';
import AdvancedScriptEditor from './AdvancedScriptEditor';
import ExecutionPanel from './ExecutionPanel';
import corsExtensionService from '../../services/corsExtensionService';
import CorsExtensionInfo from './CorsExtensionInfo';
import CorsExtensionTester from './CorsExtensionTester';
import CorsDebugPanel from './CorsDebugPanel';
import type { PlaywrightScript } from '../../types/playwrightScript';

export default function PlaywrightModule() {
  const [activeTab, setActiveTab] = useState<'scripts' | 'editor'>('scripts');
  const [selectedScript, setSelectedScript] = useState<PlaywrightScript | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'editor' | 'viewer'>('list');
  const [executingScript, setExecutingScript] = useState<PlaywrightScript | null>(null);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [corsExtensionStatus, setCorsExtensionStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [showCorsInfo, setShowCorsInfo] = useState(false);
  const [showCorsTester, setShowCorsTester] = useState(false);
  const [showCorsDebug, setShowCorsDebug] = useState(false);

  const handleScriptSelect = (script: PlaywrightScript) => {
    setSelectedScript(script);
    setCurrentView('viewer');
  };

  const handleScriptEdit = (script: PlaywrightScript) => {
    setSelectedScript(script);
    setCurrentView('editor');
  };

  const handleScriptExecute = (script: PlaywrightScript) => {
    setExecutingScript(script);
    setShowExecutionPanel(true);
  };

  const handleScriptSave = (script: PlaywrightScript) => {
    console.log('Script guardado:', script);
    setSelectedScript(null);
    setCurrentView('list');
  };

  const handleNewScript = () => {
    setSelectedScript(null);
    setCurrentView('editor');
  };

  const handleBackToList = () => {
    setSelectedScript(null);
    setCurrentView('list');
  };

  // Verificar estado de la extensión de CORS
  useEffect(() => {
    const checkCorsExtension = async () => {
      try {
        const status = await corsExtensionService.detectExtension();
        setCorsExtensionStatus(status.isInstalled ? 'available' : 'unavailable');
      } catch (error) {
        setCorsExtensionStatus('unavailable');
      }
    };

    checkCorsExtension();
  }, []);

  return (
    <div className="playwright-module">
      <div className="module-header">
        <div className="header-left">
          <h2>🎭 Playwright: Scripts & Editor</h2>
          <div className="cors-status">
            {corsExtensionStatus === 'checking' && (
              <span className="status-checking">🔍 Verificando extensión CORS...</span>
            )}
            {corsExtensionStatus === 'available' && (
              <span className="status-available">✅ Extensión CORS disponible</span>
            )}
            {corsExtensionStatus === 'unavailable' && (
              <span className="status-unavailable">
                ⚠️ Extensión CORS no disponible
                <button 
                  onClick={() => setShowCorsInfo(true)}
                  className="btn-install-cors"
                >
                  Más Info
                </button>
                <button 
                  onClick={() => setShowCorsTester(true)}
                  className="btn-test-cors"
                >
                  🧪 Probar
                </button>
                <button 
                  onClick={() => setShowCorsDebug(true)}
                  className="btn-debug-cors"
                >
                  🔧 Debug
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="module-tabs">
          <button
            className={`tab-button ${activeTab === 'scripts' ? 'active' : ''}`}
            onClick={() => setActiveTab('scripts')}
          >
            📋 Scripts
          </button>
          <button
            className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            ✏️ Editor
          </button>
        </div>
      </div>

      {showExecutionPanel && executingScript && (
        <ExecutionPanel
          script={executingScript}
          isOpen={showExecutionPanel}
          onClose={() => {
            setShowExecutionPanel(false);
            setExecutingScript(null);
          }}
        />
      )}

      <div className="module-content">
        {activeTab === 'scripts' && (
          <div className="scripts-tab">
            {currentView === 'list' && (
              <div className="list-view">
                <div className="view-header">
                  <h3>📜 Scripts de Playwright</h3>
                  <button onClick={handleNewScript} className="btn-new-script">
                    ➕ Nuevo Script
                  </button>
                </div>
                <ScriptsList
                  onScriptSelect={handleScriptSelect}
                  onScriptEdit={handleScriptEdit}
                  onScriptExecute={handleScriptExecute}
                />
              </div>
            )}

            {currentView === 'editor' && (
              <div className="editor-view">
                <div className="view-header">
                  <button onClick={handleBackToList} className="btn-back">
                    ← Volver a la lista
                  </button>
                  <h3>✏️ Editor de Script</h3>
                </div>
                <AdvancedScriptEditor
                  script={selectedScript || undefined}
                  onSave={handleScriptSave}
                  onExecute={handleScriptExecute}
                />
              </div>
            )}

            {currentView === 'viewer' && selectedScript && (
              <div className="viewer-view">
                <div className="view-header">
                  <button onClick={handleBackToList} className="btn-back">
                    ← Volver a la lista
                  </button>
                  <h3>👁️ Vista del Script</h3>
                  <div className="viewer-actions">
                    <button onClick={() => handleScriptEdit(selectedScript)} className="btn-edit">
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleScriptExecute(selectedScript)} className="btn-execute">
                      ▶️ Ejecutar
                    </button>
                  </div>
                </div>
                <div className="script-viewer">
                  <div className="script-info">
                    <h4>{selectedScript.name}</h4>
                    {selectedScript.description && (
                      <p className="script-description">{selectedScript.description}</p>
                    )}
                    <div className="script-meta">
                      <span><strong>URL:</strong> {selectedScript.url}</span>
                      <span><strong>Estado:</strong> {selectedScript.status}</span>
                      <span><strong>Ejecuciones:</strong> {selectedScript.executionCount}</span>
                    </div>
                    <div className="script-tags">
                      {selectedScript.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="script-steps">
                    <h5>Pasos del Script ({selectedScript.steps.length})</h5>
                    <div className="steps-list">
                      {selectedScript.steps.map((step, index) => (
                        <div key={step.id} className="step-item">
                          <span className="step-number">{index + 1}</span>
                          <div className="step-content">
                            <div className="step-action">{step.action}</div>
                            <div className="step-target">{step.target}</div>
                            {step.value && <div className="step-value">{step.value}</div>}
                            {step.description && <div className="step-description">{step.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="editor-tab">
            <div className="editor-header">
              <h3>🛠️ Editor Avanzado de Scripts</h3>
              <p>Editor completo para crear y editar scripts de Playwright</p>
            </div>
            <AdvancedScriptEditor
              script={selectedScript || undefined}
              onSave={handleScriptSave}
              onExecute={handleScriptExecute}
            />
          </div>
        )}
      </div>

      <style>{`
        .playwright-module {
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
        }

        .module-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e9ecef;
        }

        .header-left {
          flex: 1;
        }

        .cors-status {
          margin-top: 8px;
          font-size: 14px;
        }

        .status-checking {
          color: #856404;
          background: #fff3cd;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .status-available {
          color: #155724;
          background: #d4edda;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .status-unavailable {
          color: #721c24;
          background: #f8d7da;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-install-cors {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 11px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-install-cors:hover {
          background: #0056b3;
        }

        .btn-test-cors {
          background: #ffc107;
          color: #212529;
          border: none;
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 11px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-test-cors:hover {
          background: #e0a800;
        }

        .btn-debug-cors {
          background: #17a2b8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 11px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-debug-cors:hover {
          background: #138496;
        }

        .cors-tester-modal {
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

        .tester-modal-content {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          width: 90%;
        }

        .tester-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e9ecef;
          background: #f8f9fa;
          border-radius: 12px 12px 0 0;
        }

        .tester-modal-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .btn-close-tester {
          background: none;
          border: none;
          font-size: 24px;
          color: #6c757d;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s ease;
        }

        .btn-close-tester:hover {
          background: #e9ecef;
        }

        .cors-debug-modal {
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

        .debug-modal-content {
          background: white;
          border-radius: 12px;
          max-width: 1000px;
          max-height: 90vh;
          overflow-y: auto;
          width: 90%;
        }

        .debug-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e9ecef;
          background: #f8f9fa;
          border-radius: 12px 12px 0 0;
        }

        .debug-modal-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .btn-close-debug {
          background: none;
          border: none;
          font-size: 24px;
          color: #6c757d;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s ease;
        }

        .btn-close-debug:hover {
          background: #e9ecef;
        }

        .module-header h2 {
          margin: 0;
          color: #495057;
        }

        .module-tabs {
          display: flex;
          gap: 5px;
        }

        .tab-button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          background-color: #e9ecef;
          color: #495057;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          background-color: #dee2e6;
        }

        .tab-button.active {
          background-color: #007bff;
          color: white;
        }

        .module-content {
          min-height: 400px;
        }

        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #e0e0e0;
          background: #f8f9fa;
        }

        .view-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .btn-back {
          padding: 8px 16px;
          background: #95a5a6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-back:hover {
          background: #7f8c8d;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn-test-script {
          padding: 10px 20px;
          background: #f39c12;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-test-script:hover {
          background: #e67e22;
        }

        .btn-new-script {
          padding: 10px 20px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-new-script:hover {
          background: #229954;
        }

        .viewer-actions {
          display: flex;
          gap: 10px;
        }

        .btn-edit, .btn-execute {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-edit {
          background: #f39c12;
          color: white;
        }

        .btn-edit:hover {
          background: #e67e22;
        }

        .btn-execute {
          background: #e74c3c;
          color: white;
        }

        .btn-execute:hover {
          background: #c0392b;
        }

        .script-viewer {
          padding: 20px;
        }

        .script-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .script-info h4 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }

        .script-description {
          color: #7f8c8d;
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .script-meta {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .script-tags {
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
        }

        .script-steps h5 {
          margin-bottom: 15px;
          color: #2c3e50;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
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
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .step-action {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .step-target {
          font-family: monospace;
          color: #7f8c8d;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .step-value {
          color: #27ae60;
          font-style: italic;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .step-description {
          color: #95a5a6;
          font-size: 12px;
          font-style: italic;
        }

        .editor-tab {
          padding: 20px;
        }

        .editor-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .editor-header h3 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .editor-header p {
          color: #7f8c8d;
          margin: 0;
        }
      `}</style>

      <CorsExtensionInfo 
        isVisible={showCorsInfo}
        onClose={() => setShowCorsInfo(false)}
      />

      {showCorsTester && (
        <div className="cors-tester-modal">
          <div className="tester-modal-content">
            <div className="tester-modal-header">
              <h3>🔧 Validador de Extensión CORS</h3>
              <button onClick={() => setShowCorsTester(false)} className="btn-close-tester">×</button>
            </div>
            <CorsExtensionTester />
          </div>
        </div>
      )}

      {showCorsDebug && (
        <div className="cors-debug-modal">
          <div className="debug-modal-content">
            <div className="debug-modal-header">
              <h3>🔧 Panel de Debug CORS</h3>
              <button onClick={() => setShowCorsDebug(false)} className="btn-close-debug">×</button>
            </div>
            <CorsDebugPanel />
          </div>
        </div>
      )}
    </div>
  );
} 