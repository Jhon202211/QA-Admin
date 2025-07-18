import { useState } from 'react';
import corsExtensionService from '../../services/corsExtensionService';

interface CorsExtensionInfoProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function CorsExtensionInfo({ isVisible, onClose }: CorsExtensionInfoProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = () => {
    setIsInstalling(true);
    corsExtensionService.showInstallInstructions();
    setTimeout(() => setIsInstalling(false), 2000);
  };

  if (!isVisible) return null;

  return (
    <div className="cors-extension-info">
      <div className="info-header">
        <h3>🔧 Extensión de CORS</h3>
        <button onClick={onClose} className="btn-close">×</button>
      </div>

      <div className="info-content">
        <div className="info-section">
          <h4>🎯 ¿Qué hace la extensión?</h4>
          <p>
            La extensión de CORS permite superar las limitaciones de seguridad del navegador para:
          </p>
          <ul>
            <li>✅ Grabar eventos en múltiples pestañas</li>
            <li>✅ Ejecutar scripts que interactúen con otros sitios</li>
            <li>✅ Automatizar flujos complejos entre dominios</li>
            <li>✅ Acceder a contenido de diferentes orígenes</li>
          </ul>
        </div>

        <div className="info-section">
          <h4>🚀 Funcionalidades habilitadas</h4>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">🎙️</span>
              <div className="feature-text">
                <strong>Grabación Multi-pestaña</strong>
                <p>Graba clics y eventos en diferentes pestañas del navegador</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">▶️</span>
              <div className="feature-text">
                <strong>Ejecución Cross-Origin</strong>
                <p>Ejecuta scripts que interactúen con múltiples sitios</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">🔗</span>
              <div className="feature-text">
                <strong>Flujos Complejos</strong>
                <p>Automatiza procesos que involucren varios dominios</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">⚙️</span>
              <div className="feature-text">
                <strong>Configuración Flexible</strong>
                <p>Lista blanca para controlar qué sitios permitir</p>
              </div>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h4>⚠️ Limitaciones sin extensión</h4>
          <ul className="limitations-list">
            <li>❌ Solo grabación en la pestaña actual</li>
            <li>❌ No ejecución cross-origin</li>
            <li>❌ Flujos limitados a un solo sitio</li>
            <li>❌ Restricciones de seguridad del navegador</li>
          </ul>
        </div>

        <div className="info-section">
          <h4>🔒 Seguridad</h4>
          <p>
            La extensión se usa únicamente para desarrollo y testing. 
            Se recomienda desactivarla cuando no se esté trabajando con automatización.
          </p>
        </div>
      </div>

      <div className="info-actions">
        <button 
          onClick={handleInstall}
          className="btn-install"
          disabled={isInstalling}
        >
          {isInstalling ? '🔄 Instalando...' : '📦 Instalar Extensión'}
        </button>
        <button onClick={onClose} className="btn-close-info">
          Entendido
        </button>
      </div>

      <style>{`
        .cors-extension-info {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          z-index: 1000;
          border: 1px solid #dee2e6;
        }

        .info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid #e9ecef;
          background: #f8f9fa;
          border-radius: 12px 12px 0 0;
        }

        .info-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .btn-close {
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

        .btn-close:hover {
          background: #e9ecef;
        }

        .info-content {
          padding: 25px;
        }

        .info-section {
          margin-bottom: 25px;
        }

        .info-section h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
          font-size: 16px;
        }

        .info-section p {
          margin: 0 0 10px 0;
          color: #495057;
          line-height: 1.5;
        }

        .info-section ul {
          margin: 0;
          padding-left: 20px;
          color: #495057;
        }

        .info-section li {
          margin-bottom: 5px;
          line-height: 1.4;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .feature-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .feature-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .feature-text strong {
          display: block;
          color: #2c3e50;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .feature-text p {
          margin: 0;
          font-size: 12px;
          color: #6c757d;
          line-height: 1.3;
        }

        .limitations-list {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin: 0;
        }

        .limitations-list li {
          color: #856404;
          font-size: 13px;
        }

        .info-actions {
          display: flex;
          gap: 10px;
          padding: 20px 25px;
          border-top: 1px solid #e9ecef;
          background: #f8f9fa;
          border-radius: 0 0 12px 12px;
        }

        .btn-install {
          flex: 1;
          padding: 12px 20px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-install:hover:not(:disabled) {
          background: #218838;
        }

        .btn-install:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-close-info {
          padding: 12px 20px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-close-info:hover {
          background: #5a6268;
        }

        @media (max-width: 768px) {
          .cors-extension-info {
            width: 90%;
            max-width: none;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .info-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
} 