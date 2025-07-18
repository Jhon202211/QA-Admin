import { useState, useEffect } from 'react';
import corsExtensionService from '../../services/corsExtensionService';

export default function CorsExtensionTester() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [finalStatus, setFinalStatus] = useState<any>(null);

  const runDetectionTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    setFinalStatus(null);

    const results: any[] = [];

    // Test 1: Detección básica
    try {
      console.log('🧪 Iniciando test de detección de extensión CORS...');
      results.push({
        test: 'Detección Básica',
        status: 'running',
        message: 'Verificando presencia de extensión...'
      });
      setTestResults([...results]);

      const status = await corsExtensionService.detectExtension();
      
      results[results.length - 1] = {
        test: 'Detección Básica',
        status: status.isInstalled ? 'success' : 'error',
        message: status.isInstalled 
          ? `✅ Extensión detectada (Enabled: ${status.isEnabled})`
          : '❌ No se detectó extensión de CORS'
      };
      setTestResults([...results]);

      // Test 2: Verificar capacidades
      if (status.isInstalled) {
        results.push({
          test: 'Verificar Capacidades',
          status: 'running',
          message: 'Probando funcionalidades...'
        });
        setTestResults([...results]);

        const canRecord = await corsExtensionService.canRecordCrossTab();
        const canExecute = await corsExtensionService.canExecuteCrossTab();

        results[results.length - 1] = {
          test: 'Verificar Capacidades',
          status: 'success',
          message: `✅ Grabación: ${canRecord ? 'Sí' : 'No'}, Ejecución: ${canExecute ? 'Sí' : 'No'}`
        };
        setTestResults([...results]);

        // Test 3: Probar activación
        results.push({
          test: 'Probar Activación',
          status: 'running',
          message: 'Activando extensión...'
        });
        setTestResults([...results]);

        const activated = await corsExtensionService.enableForRecording();
        
        results[results.length - 1] = {
          test: 'Probar Activación',
          status: activated ? 'success' : 'error',
          message: activated ? '✅ Extensión activada correctamente' : '❌ Error activando extensión'
        };
        setTestResults([...results]);

        // Test 4: Probar desactivación
        results.push({
          test: 'Probar Desactivación',
          status: 'running',
          message: 'Desactivando extensión...'
        });
        setTestResults([...results]);

        const deactivated = await corsExtensionService.disable();
        
        results[results.length - 1] = {
          test: 'Probar Desactivación',
          status: deactivated ? 'success' : 'error',
          message: deactivated ? '✅ Extensión desactivada correctamente' : '❌ Error desactivando extensión'
        };
        setTestResults([...results]);

        setFinalStatus({
          overall: 'success',
          message: '🎉 Extensión CORS funciona correctamente',
          details: {
            installed: status.isInstalled,
            enabled: status.isEnabled,
            canRecord: canRecord,
            canExecute: canExecute
          }
        });
      } else {
        setFinalStatus({
          overall: 'error',
          message: '❌ No se detectó extensión de CORS',
          details: {
            installed: false,
            enabled: false,
            canRecord: false,
            canExecute: false
          }
        });
      }
    } catch (error) {
      console.error('Error en tests:', error);
      results.push({
        test: 'Error General',
        status: 'error',
        message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      });
      setTestResults([...results]);
      
      setFinalStatus({
        overall: 'error',
        message: '❌ Error durante las pruebas',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'running': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      default: return '⏸️';
    }
  };

  return (
    <div className="cors-extension-tester">
      <div className="tester-header">
        <h3>🔧 Validador de Extensión CORS</h3>
        <button 
          onClick={runDetectionTests}
          disabled={isTesting}
          className="btn-run-tests"
        >
          {isTesting ? '🔄 Ejecutando...' : '🧪 Ejecutar Tests'}
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="test-results">
          <h4>Resultados de las Pruebas</h4>
          <div className="results-list">
            {testResults.map((result, index) => (
              <div key={index} className="test-result">
                <span className="test-name">{result.test}</span>
                <span 
                  className="test-status"
                  style={{ color: getStatusColor(result.status) }}
                >
                  {getStatusIcon(result.status)} {result.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {finalStatus && (
        <div className={`final-status ${finalStatus.overall}`}>
          <h4>{finalStatus.message}</h4>
          {finalStatus.details && (
            <div className="status-details">
              <div className="detail-item">
                <span>Instalada:</span>
                <span className={finalStatus.details.installed ? 'success' : 'error'}>
                  {finalStatus.details.installed ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div className="detail-item">
                <span>Habilitada:</span>
                <span className={finalStatus.details.enabled ? 'success' : 'error'}>
                  {finalStatus.details.enabled ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div className="detail-item">
                <span>Grabación Multi-pestaña:</span>
                <span className={finalStatus.details.canRecord ? 'success' : 'error'}>
                  {finalStatus.details.canRecord ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div className="detail-item">
                <span>Ejecución Cross-Origin:</span>
                <span className={finalStatus.details.canExecute ? 'success' : 'error'}>
                  {finalStatus.details.canExecute ? '✅ Sí' : '❌ No'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tester-info">
        <h4>📋 Información de Debug</h4>
        <div className="debug-info">
          <div className="info-item">
            <strong>User Agent:</strong> {navigator.userAgent}
          </div>
          <div className="info-item">
            <strong>Chrome Runtime:</strong> {typeof window.chrome !== 'undefined' && window.chrome?.runtime ? '✅ Disponible' : '❌ No disponible'}
          </div>
          <div className="info-item">
            <strong>URL Actual:</strong> {window.location.href}
          </div>
          <div className="info-item">
            <strong>Timestamp:</strong> {new Date().toISOString()}
          </div>
        </div>
      </div>

      <style>{`
        .cors-extension-tester {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .tester-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .tester-header h3 {
          margin: 0;
          color: #495057;
        }

        .btn-run-tests {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-run-tests:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-run-tests:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .test-results {
          margin-bottom: 20px;
        }

        .test-results h4 {
          margin: 0 0 15px 0;
          color: #495057;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .test-result {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .test-name {
          font-weight: 500;
          color: #495057;
        }

        .test-status {
          font-size: 14px;
        }

        .final-status {
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .final-status.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .final-status.error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .final-status h4 {
          margin: 0 0 10px 0;
        }

        .status-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
        }

        .detail-item .success {
          color: #28a745;
          font-weight: 500;
        }

        .detail-item .error {
          color: #dc3545;
          font-weight: 500;
        }

        .tester-info {
          margin-top: 20px;
        }

        .tester-info h4 {
          margin: 0 0 15px 0;
          color: #495057;
        }

        .debug-info {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 15px;
        }

        .info-item {
          margin-bottom: 8px;
          font-size: 12px;
          word-break: break-all;
        }

        .info-item strong {
          color: #495057;
        }

        @media (max-width: 768px) {
          .tester-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }

          .status-details {
            grid-template-columns: 1fr;
          }

          .test-result {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
} 