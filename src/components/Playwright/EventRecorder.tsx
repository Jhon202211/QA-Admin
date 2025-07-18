import { useState, useEffect, useRef } from 'react';
import corsExtensionService from '../../services/corsExtensionService';
import type { PlaywrightStep } from '../../types/playwrightScript';

interface EventRecorderProps {
  onStepRecorded: (step: PlaywrightStep) => void;
  onRecordingComplete: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

interface RecordedEvent {
  type: 'click' | 'fill' | 'navigate' | 'wait' | 'screenshot';
  target: string;
  value?: string;
  timestamp: number;
  url?: string;
  description?: string;
}

export default function EventRecorder({
  onStepRecorded,
  onRecordingComplete,
  isRecording,
  onStartRecording,
  onStopRecording
}: EventRecorderProps) {
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'starting' | 'recording' | 'stopping'>('idle');
  const [corsExtensionStatus, setCorsExtensionStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [recordedEvents, setRecordedEvents] = useState<RecordedEvent[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [recordingMode, setRecordingMode] = useState<'single-tab' | 'multi-tab'>('single-tab');
  
  const eventListenerRef = useRef<((event: any) => void) | null>(null);
  const recordingStartTime = useRef<number>(0);

  useEffect(() => {
    checkCorsExtension();
  }, []);

  useEffect(() => {
    if (isRecording && recordingStatus === 'idle') {
      startRecording();
    } else if (!isRecording && recordingStatus === 'recording') {
      stopRecording();
    }
  }, [isRecording]);

  const checkCorsExtension = async () => {
    setCorsExtensionStatus('checking');
    try {
      const status = await corsExtensionService.detectExtension();
      setCorsExtensionStatus(status.isInstalled ? 'available' : 'unavailable');
    } catch (error) {
      setCorsExtensionStatus('unavailable');
    }
  };

  const startRecording = async () => {
    setRecordingStatus('starting');
    recordingStartTime.current = Date.now();

    try {
      // Activar extensión de CORS si está disponible
      if (corsExtensionStatus === 'available') {
        await corsExtensionService.enableForRecording();
        setRecordingMode('multi-tab');
      } else {
        setRecordingMode('single-tab');
      }

      // Configurar listeners de eventos
      setupEventListeners();

      setRecordingStatus('recording');
      setRecordedEvents([]);
      
      console.log('🎙️ Grabación iniciada');
    } catch (error) {
      console.error('❌ Error iniciando grabación:', error);
      setRecordingStatus('idle');
    }
  };

  const stopRecording = async () => {
    setRecordingStatus('stopping');

    try {
      // Remover listeners
      removeEventListeners();

      // Desactivar extensión de CORS
      if (corsExtensionStatus === 'available') {
        await corsExtensionService.disable();
      }

      // Convertir eventos grabados a pasos de Playwright
      convertEventsToSteps();

      setRecordingStatus('idle');
      console.log('⏹️ Grabación detenida');
    } catch (error) {
      console.error('❌ Error deteniendo grabación:', error);
      setRecordingStatus('idle');
    }
  };

  const setupEventListeners = () => {
    // Listener para eventos de clic
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const selector = generateSelector(target);
      
      const recordedEvent: RecordedEvent = {
        type: 'click',
        target: selector,
        timestamp: Date.now(),
        url: window.location.href,
        description: `Clic en ${target.tagName.toLowerCase()}${target.className ? '.' + target.className.split(' ')[0] : ''}`
      };

      addRecordedEvent(recordedEvent);
    };

    // Listener para eventos de llenado de campos
    const inputListener = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const selector = generateSelector(target);
      const value = target.value;

      const recordedEvent: RecordedEvent = {
        type: 'fill',
        target: selector,
        value: value,
        timestamp: Date.now(),
        url: window.location.href,
        description: `Llenar campo ${target.tagName.toLowerCase()}`
      };

      addRecordedEvent(recordedEvent);
    };

    // Listener para navegación
    const navigationListener = () => {
      const recordedEvent: RecordedEvent = {
        type: 'navigate',
        target: window.location.href,
        timestamp: Date.now(),
        url: window.location.href,
        description: `Navegar a ${window.location.href}`
      };

      addRecordedEvent(recordedEvent);
    };

    // Agregar listeners
    document.addEventListener('click', clickListener, true);
    document.addEventListener('input', inputListener, true);
    document.addEventListener('change', inputListener, true);
    window.addEventListener('popstate', navigationListener);
    window.addEventListener('pushstate', navigationListener);

    eventListenerRef.current = (event: any) => {
      // Listener para eventos de otras pestañas (si extensión está disponible)
      if (corsExtensionStatus === 'available' && event.data?.type === 'CORS_RECORDED_EVENT') {
        addRecordedEvent(event.data.event);
      }
    };

    window.addEventListener('message', eventListenerRef.current);
  };

  const removeEventListeners = () => {
    if (eventListenerRef.current) {
      window.removeEventListener('message', eventListenerRef.current);
      eventListenerRef.current = null;
    }

    // Remover otros listeners
    document.removeEventListener('click', () => {}, true);
    document.removeEventListener('input', () => {}, true);
    document.removeEventListener('change', () => {}, true);
    window.removeEventListener('popstate', () => {});
    window.removeEventListener('pushstate', () => {});
  };

  const generateSelector = (element: HTMLElement): string => {
    // Generar selector CSS para el elemento
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }

    // Usar selector de atributos
    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }

    if (element.getAttribute('name')) {
      return `[name="${element.getAttribute('name')}"]`;
    }

    // Selector por tag y posición
    const tagName = element.tagName.toLowerCase();
    const siblings = Array.from(element.parentElement?.children || []);
    const index = siblings.indexOf(element);
    
    return `${tagName}:nth-child(${index + 1})`;
  };

  const addRecordedEvent = (event: RecordedEvent) => {
    setRecordedEvents(prev => [...prev, event]);
    console.log('📝 Evento grabado:', event);
  };

  const convertEventsToSteps = () => {
    const steps: PlaywrightStep[] = recordedEvents.map((event, index) => {
      const step: PlaywrightStep = {
        id: `step-${Date.now()}-${index}`,
        action: event.type === 'navigate' ? 'goto' : event.type,
        target: event.target,
        value: event.value || '',
        description: event.description || `Paso ${index + 1}`,
        order: index
      };

      onStepRecorded(step);
      return step;
    });

    console.log('🔄 Eventos convertidos a pasos:', steps);
  };

  const handleStartRecording = () => {
    if (corsExtensionStatus === 'unavailable') {
      corsExtensionService.showInstallInstructions();
      return;
    }
    onStartRecording();
  };

  const handleStopRecording = () => {
    onStopRecording();
  };

  const addWaitStep = () => {
    const waitStep: PlaywrightStep = {
      id: `wait-${Date.now()}`,
      action: 'wait',
      target: '',
      value: '1000',
      description: 'Esperar 1 segundo',
      order: recordedEvents.length
    };

    onStepRecorded(waitStep);
  };

  const addScreenshotStep = () => {
    const screenshotStep: PlaywrightStep = {
      id: `screenshot-${Date.now()}`,
      action: 'screenshot',
      target: '',
      value: '',
      description: 'Capturar pantalla',
      order: recordedEvents.length
    };

    onStepRecorded(screenshotStep);
  };

  return (
    <div className="event-recorder">
      <div className="recorder-header">
        <h3>🎙️ Grabador de Eventos</h3>
        <div className="recorder-status">
          <span className={`status-indicator ${recordingStatus}`}>
            {recordingStatus === 'idle' && '⏸️ Inactivo'}
            {recordingStatus === 'starting' && '🔄 Iniciando...'}
            {recordingStatus === 'recording' && '🔴 Grabando...'}
            {recordingStatus === 'stopping' && '⏹️ Deteniendo...'}
          </span>
          
          {corsExtensionStatus === 'available' && (
            <span className="cors-available">✅ Extensión CORS disponible</span>
          )}
          
          {corsExtensionStatus === 'unavailable' && (
            <span className="cors-unavailable">⚠️ Extensión CORS no disponible</span>
          )}
        </div>
      </div>

      <div className="recorder-controls">
        {!isRecording ? (
          <button 
            onClick={handleStartRecording}
            className="btn-start-recording"
            disabled={recordingStatus !== 'idle'}
          >
            🎙️ Iniciar Grabación
          </button>
        ) : (
          <button 
            onClick={handleStopRecording}
            className="btn-stop-recording"
            disabled={recordingStatus !== 'recording'}
          >
            ⏹️ Detener Grabación
          </button>
        )}
      </div>

      {isRecording && (
        <div className="recording-info">
          <div className="recording-stats">
            <span>Eventos grabados: {recordedEvents.length}</span>
            <span>Modo: {recordingMode === 'multi-tab' ? 'Multi-pestaña' : 'Pestaña única'}</span>
            <span>URL actual: {currentUrl}</span>
          </div>

          <div className="manual-actions">
            <button onClick={addWaitStep} className="btn-add-wait">
              ⏱️ Agregar Espera
            </button>
            <button onClick={addScreenshotStep} className="btn-add-screenshot">
              📸 Agregar Captura
            </button>
          </div>
        </div>
      )}

      {recordedEvents.length > 0 && (
        <div className="recorded-events">
          <h4>Eventos Grabados ({recordedEvents.length})</h4>
          <div className="events-list">
            {recordedEvents.map((event, index) => (
              <div key={index} className="event-item">
                <span className="event-type">{event.type}</span>
                <span className="event-target">{event.target}</span>
                {event.value && <span className="event-value">{event.value}</span>}
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .event-recorder {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .recorder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .recorder-header h3 {
          margin: 0;
          color: #495057;
        }

        .recorder-status {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .status-indicator {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-indicator.idle {
          background: #e9ecef;
          color: #6c757d;
        }

        .status-indicator.starting {
          background: #fff3cd;
          color: #856404;
        }

        .status-indicator.recording {
          background: #f8d7da;
          color: #721c24;
          animation: pulse 1s infinite;
        }

        .status-indicator.stopping {
          background: #d1ecf1;
          color: #0c5460;
        }

        .cors-available {
          color: #28a745;
          font-size: 12px;
        }

        .cors-unavailable {
          color: #dc3545;
          font-size: 12px;
        }

        .recorder-controls {
          margin-bottom: 15px;
        }

        .btn-start-recording,
        .btn-stop-recording {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-start-recording {
          background: #28a745;
          color: white;
        }

        .btn-start-recording:hover {
          background: #218838;
        }

        .btn-stop-recording {
          background: #dc3545;
          color: white;
        }

        .btn-stop-recording:hover {
          background: #c82333;
        }

        .recording-info {
          background: #e9ecef;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .recording-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .manual-actions {
          display: flex;
          gap: 10px;
        }

        .btn-add-wait,
        .btn-add-screenshot {
          padding: 6px 12px;
          border: 1px solid #6c757d;
          border-radius: 4px;
          background: white;
          color: #495057;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-add-wait:hover,
        .btn-add-screenshot:hover {
          background: #f8f9fa;
        }

        .recorded-events {
          margin-top: 20px;
        }

        .recorded-events h4 {
          margin: 0 0 10px 0;
          color: #495057;
        }

        .events-list {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: white;
        }

        .event-item {
          display: flex;
          gap: 10px;
          padding: 8px 12px;
          border-bottom: 1px solid #f1f3f4;
          font-size: 12px;
        }

        .event-item:last-child {
          border-bottom: none;
        }

        .event-type {
          font-weight: 500;
          color: #007bff;
          min-width: 60px;
        }

        .event-target {
          flex: 1;
          color: #495057;
          word-break: break-all;
        }

        .event-value {
          color: #6c757d;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-time {
          color: #6c757d;
          font-size: 11px;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
} 