import { useState, useEffect } from 'react';
import corsExtensionService from '../../services/corsExtensionService';

export default function CorsDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runDebugTests = async () => {
    setIsRunning(true);
    setLogs([]);
    setDebugInfo({});

    addLog('🧪 Iniciando debug de extensión CORS...');

    // Test 1: Información del navegador
    const browserInfo = {
      userAgent: navigator.userAgent,
      chromeAvailable: typeof window.chrome !== 'undefined',
      chromeRuntime: typeof window.chrome !== 'undefined' && !!window.chrome?.runtime,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    addLog(`🌐 User Agent: ${browserInfo.userAgent}`);
    addLog(`🔧 Chrome disponible: ${browserInfo.chromeAvailable}`);
    addLog(`⚙️ Chrome Runtime: ${browserInfo.chromeRuntime}`);

    setDebugInfo(prev => ({ ...prev, browserInfo }));

    // Test 2: Detección de extensiones
    try {
      addLog('🔍 Probando detección de extensiones...');
      
      const status = await corsExtensionService.detectExtension();
      
      addLog(`📊 Resultado detección: ${JSON.stringify(status, null, 2)}`);
      
      setDebugInfo(prev => ({ ...prev, detectionStatus: status }));

      if (status.isInstalled) {
        addLog('✅ Extensión detectada');
        
        // Test 3: Probar comunicación
        addLog('💬 Probando comunicación con extensión...');
        
        try {
          const config = await corsExtensionService.getConfig();
          addLog(`⚙️ Configuración: ${JSON.stringify(config, null, 2)}`);
          setDebugInfo(prev => ({ ...prev, config }));
        } catch (error) {
          addLog(`❌ Error obteniendo configuración: ${error}`);
        }

        // Test 4: Probar activación
        addLog('🔓 Probando activación...');
        
        try {
          const activated = await corsExtensionService.enableForRecording();
          addLog(`🎯 Activación: ${activated ? '✅ Exitoso' : '❌ Falló'}`);
          setDebugInfo(prev => ({ ...prev, activationTest: activated }));
        } catch (error) {
          addLog(`❌ Error en activación: ${error}`);
        }

        // Test 5: Probar desactivación
        addLog('🔒 Probando desactivación...');
        
        try {
          const deactivated = await corsExtensionService.disable();
          addLog(`🎯 Desactivación: ${deactivated ? '✅ Exitoso' : '❌ Falló'}`);
          setDebugInfo(prev => ({ ...prev, deactivationTest: deactivated }));
        } catch (error) {
          addLog(`❌ Error en desactivación: ${error}`);
        }
      } else {
        addLog('❌ No se detectó extensión');
      }
    } catch (error) {
      addLog(`❌ Error en detección: ${error}`);
    }

    // Test 6: Verificar capacidades
    try {
      addLog('🔍 Verificando capacidades...');
      
      const canRecord = await corsExtensionService.canRecordCrossTab();
      const canExecute = await corsExtensionService.canExecuteCrossTab();
      
      addLog(`📹 Grabación multi-pestaña: ${canRecord ? '✅ Sí' : '❌ No'}`);
      addLog(`▶️ Ejecución cross-origin: ${canExecute ? '✅ Sí' : '❌ No'}`);
      
      setDebugInfo(prev => ({ 
        ...prev, 
        capabilities: { canRecord, canExecute } 
      }));
    } catch (error) {
      addLog(`❌ Error verificando capacidades: ${error}`);
    }

    addLog('🏁 Debug completado');
    setIsRunning(false);
  };

  const clearLogs = () => {
    setLogs([]);
    setDebugInfo({});
  };

  const exportDebugInfo = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      debugInfo,
      logs
    };
    
    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cors-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cors-debug-panel">
      <div className="debug-header">
        <h3>🔧 Panel de Debug CORS</h3>
        <div className="debug-controls">
          <button 
            onClick={runDebugTests}
            disabled={isRunning}
            className="btn-run-debug"
          >
            {isRunning ? '🔄 Ejecutando...' : '🧪 Ejecutar Debug'}
          </button>
          <button onClick={clearLogs} className="btn-clear-logs">
            🗑️ Limpiar
          </button>
          <button onClick={exportDebugInfo} className="btn-export">
            📤 Exportar
          </button>
        </div>
      </div>

      <div className="debug-content">
        <div className="debug-section">
          <h4>📋 Logs de Debug</h4>
          <div className="logs-container">
            {logs.length === 0 ? (
              <p className="no-logs">No hay logs disponibles. Ejecuta el debug para ver información.</p>
            ) : (
              <div className="logs-list">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {Object.keys(debugInfo).length > 0 && (
          <div className="debug-section">
            <h4>📊 Información de Debug</h4>
            <div className="debug-info">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .cors-debug-panel {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .debug-header h3 {
          margin: 0;
          color: #495057;
        }

        .debug-controls {
          display: flex;
          gap: 10px;
        }

        .btn-run-debug,
        .btn-clear-logs,
        .btn-export {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-run-debug {
          background: #007bff;
          color: white;
        }

        .btn-run-debug:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-run-debug:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-clear-logs {
          background: #6c757d;
          color: white;
        }

        .btn-clear-logs:hover {
          background: #5a6268;
        }

        .btn-export {
          background: #28a745;
          color: white;
        }

        .btn-export:hover {
          background: #218838;
        }

        .debug-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .debug-section {
          background: white;
          border-radius: 6px;
          padding: 15px;
          border: 1px solid #e9ecef;
        }

        .debug-section h4 {
          margin: 0 0 15px 0;
          color: #495057;
        }

        .logs-container {
          max-height: 300px;
          overflow-y: auto;
        }

        .no-logs {
          color: #6c757d;
          font-style: italic;
          text-align: center;
          padding: 20px;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .log-entry {
          font-family: monospace;
          font-size: 11px;
          padding: 4px 8px;
          background: #f8f9fa;
          border-radius: 3px;
          border-left: 3px solid #007bff;
          word-break: break-all;
        }

        .debug-info {
          max-height: 300px;
          overflow-y: auto;
        }

        .debug-info pre {
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          font-size: 11px;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        @media (max-width: 768px) {
          .debug-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }

          .debug-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
} 