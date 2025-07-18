import { useState, useEffect } from 'react';
import type { PlaywrightScript } from '../../types/playwrightScript';
import type { ExecutionResult } from '../../services/playwrightExecutor';
import playwrightExecutor from '../../services/playwrightExecutor';
import playwrightScriptsService from '../../firebase/playwrightScripts';

interface ExecutionPanelProps {
  script: PlaywrightScript;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutionPanel({ script, isOpen, onClose }: ExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    if (isOpen && script) {
      executeScript();
    }
  }, [isOpen, script]);

  const executeScript = async () => {
    setIsExecuting(true);
    setCurrentStep(0);
    setTotalSteps(script.steps.length);
    setCurrentMessage('');
    setResult(null);

    try {
      // Función de callback para progreso en tiempo real
      const onProgress = (step: number, total: number, message: string) => {
        setCurrentStep(step);
        setTotalSteps(total);
        setCurrentMessage(message);
      };

      // Ejecutar el script con progreso en tiempo real
      const executionResult = await playwrightExecutor.executeScript(script, onProgress);
      
      setResult(executionResult);

      // Incrementar contador de ejecuciones en Firebase
      await playwrightScriptsService.incrementExecutionCount(script.id);

    } catch (error) {
      console.error('Error ejecutando script:', error);
      setResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: 0,
        currentStep,
        totalSteps
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const stopExecution = () => {
    playwrightExecutor.stopExecution();
    setIsExecuting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="execution-panel-overlay">
      <div className="execution-panel">
        <div className="execution-header">
          <h3>🚀 Ejecutando: {script.name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="execution-content">
          {isExecuting && (
            <div className="execution-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {currentMessage || `Ejecutando paso ${currentStep} de ${totalSteps}...`}
              </p>
              <div className="execution-steps">
                <h4>Pasos ejecutándose:</h4>
                <ul>
                  {script.steps.map((step, index) => (
                    <li key={step.id} className={index < currentStep ? 'completed' : ''}>
                      {index < currentStep ? '✅' : '⏳'} 
                      Paso {index + 1}: {step.action} - {step.target}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="execution-controls">
                <button onClick={stopExecution} className="btn-stop">
                  ⏹️ Detener Ejecución
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="execution-result">
              <div className={`result-header ${result.success ? 'success' : 'error'}`}>
                <h4>
                  {result.success ? '✅ Ejecución Completada' : '❌ Error en la Ejecución'}
                </h4>
                <span className="duration">
                  Duración: {result.duration}ms
                </span>
              </div>

              {result.success && (
                <div className="result-success">
                  <div className="output-section">
                    <h5>📋 Salida del Script:</h5>
                    <pre className="output-log">{result.output}</pre>
                  </div>
                  
                  {result.screenshots && result.screenshots.length > 0 && (
                    <div className="screenshots-section">
                      <h5>📸 Capturas de Pantalla:</h5>
                      <div className="screenshots-grid">
                        {result.screenshots.map((screenshot, index) => (
                          <div key={index} className="screenshot-item">
                            <img src={screenshot} alt={`Screenshot ${index + 1}`} />
                            <span>Screenshot {index + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!result.success && (
                <div className="result-error">
                  <div className="error-section">
                    <h5>❌ Error:</h5>
                    <pre className="error-log">{result.error}</pre>
                  </div>
                </div>
              )}

              <div className="execution-actions">
                <button onClick={onClose} className="btn-close">
                  Cerrar
                </button>
                {result.success && (
                  <button onClick={executeScript} className="btn-rerun">
                    🔄 Ejecutar Nuevamente
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <style>{`
          .execution-panel-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .execution-panel {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          .execution-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            background: #f8f9fa;
          }

          .execution-header h3 {
            margin: 0;
            color: #2c3e50;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #7f8c8d;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .close-button:hover {
            color: #e74c3c;
          }

          .execution-content {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
          }

          .execution-progress {
            text-align: center;
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 15px;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #27ae60);
            transition: width 0.3s ease;
          }

          .progress-text {
            color: #2c3e50;
            font-weight: 500;
            margin-bottom: 20px;
          }

          .execution-steps {
            text-align: left;
          }

          .execution-steps h4 {
            color: #2c3e50;
            margin-bottom: 10px;
          }

          .execution-steps ul {
            list-style: none;
            padding: 0;
          }

          .execution-steps li {
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            color: #7f8c8d;
            transition: color 0.3s;
          }

          .execution-steps li.completed {
            color: #27ae60;
          }

          .execution-result {
            margin-top: 20px;
          }

          .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }

          .result-header.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }

          .result-header.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }

          .result-header h4 {
            margin: 0;
          }

          .duration {
            font-size: 14px;
            opacity: 0.8;
          }

          .output-section, .error-section {
            margin-bottom: 20px;
          }

          .output-section h5, .error-section h5 {
            color: #2c3e50;
            margin-bottom: 10px;
          }

          .output-log, .error-log {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
          }

          .error-log {
            background: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
          }

          .screenshots-section {
            margin-bottom: 20px;
          }

          .screenshots-section h5 {
            color: #2c3e50;
            margin-bottom: 10px;
          }

          .screenshots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
          }

          .screenshot-item {
            text-align: center;
          }

          .screenshot-item img {
            width: 100%;
            height: 100px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
          }

          .screenshot-item span {
            display: block;
            margin-top: 5px;
            font-size: 12px;
            color: #7f8c8d;
          }

          .execution-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
          }

          .btn-close, .btn-rerun {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
          }

          .btn-close {
            background: #95a5a6;
            color: white;
          }

          .btn-close:hover {
            background: #7f8c8d;
          }

          .btn-rerun {
            background: #3498db;
            color: white;
          }

          .btn-rerun:hover {
            background: #2980b9;
          }

          .execution-controls {
            margin-top: 20px;
            text-align: center;
          }

          .btn-stop {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            background: #e74c3c;
            color: white;
            transition: background-color 0.2s;
          }

          .btn-stop:hover {
            background: #c0392b;
          }
        `}</style>
      </div>
    </div>
  );
} 