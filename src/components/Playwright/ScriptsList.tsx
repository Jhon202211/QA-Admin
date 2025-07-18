import { useState, useEffect } from 'react';
import playwrightScriptsService from '../../firebase/playwrightScripts';
import type { PlaywrightScript } from '../../types/playwrightScript';

interface ScriptsListProps {
  onScriptSelect?: (script: PlaywrightScript) => void;
  onScriptEdit?: (script: PlaywrightScript) => void;
  onScriptExecute?: (script: PlaywrightScript) => void;
}

export default function ScriptsList({ onScriptSelect, onScriptEdit, onScriptExecute }: ScriptsListProps) {
  const [scripts, setScripts] = useState<PlaywrightScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const allScripts = await playwrightScriptsService.getAllScripts();
      setScripts(allScripts);
    } catch (error) {
      console.error('Error cargando scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         script.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         script.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => script.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(new Set(scripts.flatMap(script => script.tags)));

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleScriptAction = (script: PlaywrightScript, action: 'select' | 'edit' | 'execute') => {
    switch (action) {
      case 'select':
        onScriptSelect?.(script);
        break;
      case 'edit':
        onScriptEdit?.(script);
        break;
      case 'execute':
        onScriptExecute?.(script);
        break;
    }
  };

  if (loading) {
    return (
      <div className="scripts-list-loading">
        <div className="loading-spinner">🔄</div>
        <p>Cargando scripts...</p>
      </div>
    );
  }

  return (
    <div className="scripts-list">
      <div className="scripts-header">
        <h2>📜 Scripts de Playwright</h2>
        <p>Scripts almacenados en Firebase para automatización de pruebas</p>
      </div>

      <div className="scripts-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar scripts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="tags-filter">
          <h4>Filtrar por tags:</h4>
          <div className="tags-list">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`tag-button ${selectedTags.includes(tag) ? 'active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredScripts.length === 0 ? (
        <div className="no-scripts">
          <div className="no-scripts-icon">📝</div>
          <h3>No hay scripts disponibles</h3>
          <p>
            {searchTerm || selectedTags.length > 0 
              ? 'No se encontraron scripts con los filtros aplicados'
              : 'Crea tu primer script de Playwright para comenzar'
            }
          </p>
        </div>
      ) : (
        <div className="scripts-grid">
          {filteredScripts.map(script => (
            <div key={script.id} className="script-card">
              <div className="script-header">
                <h3>{script.name}</h3>
                <div className="script-status">
                  <span className={`status-badge ${script.status}`}>
                    {script.status}
                  </span>
                </div>
              </div>

              {script.description && (
                <p className="script-description">{script.description}</p>
              )}

              <div className="script-url">
                <strong>URL:</strong> {script.url}
              </div>

              <div className="script-stats">
                <span className="stat">
                  📊 {script.steps.length} pasos
                </span>
                <span className="stat">
                  🎯 {script.executionCount} ejecuciones
                </span>
                {script.lastExecuted && (
                  <span className="stat">
                    ⏰ {new Date(script.lastExecuted).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="script-tags">
                {script.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="script-actions">
                <button
                  onClick={() => handleScriptAction(script, 'select')}
                  className="btn-view"
                >
                  👁️ Ver
                </button>
                <button
                  onClick={() => handleScriptAction(script, 'edit')}
                  className="btn-edit"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleScriptAction(script, 'execute')}
                  className="btn-execute"
                >
                  ▶️ Ejecutar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .scripts-list {
          padding: 20px;
        }

        .scripts-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .scripts-header h2 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .scripts-filters {
          margin-bottom: 30px;
        }

        .search-box {
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
        }

        .search-input:focus {
          outline: none;
          border-color: #3498db;
        }

        .tags-filter h4 {
          margin-bottom: 10px;
          color: #2c3e50;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag-button {
          padding: 6px 12px;
          border: 1px solid #bdc3c7;
          border-radius: 20px;
          background: #ecf0f1;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .tag-button:hover {
          background: #d5dbdb;
        }

        .tag-button.active {
          background: #3498db;
          color: white;
          border-color: #3498db;
        }

        .no-scripts {
          text-align: center;
          padding: 60px 20px;
          color: #7f8c8d;
        }

        .no-scripts-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .scripts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .script-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .script-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .script-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .script-header h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 18px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.draft {
          background: #f39c12;
          color: white;
        }

        .status-badge.active {
          background: #27ae60;
          color: white;
        }

        .status-badge.archived {
          background: #95a5a6;
          color: white;
        }

        .script-description {
          color: #7f8c8d;
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .script-url {
          margin-bottom: 15px;
          font-size: 14px;
          color: #34495e;
        }

        .script-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .stat {
          font-size: 12px;
          color: #7f8c8d;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .script-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 20px;
        }

        .tag {
          background: #3498db;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
        }

        .script-actions {
          display: flex;
          gap: 10px;
        }

        .btn-view, .btn-edit, .btn-execute {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .btn-view {
          background: #ecf0f1;
          color: #2c3e50;
        }

        .btn-view:hover {
          background: #d5dbdb;
        }

        .btn-edit {
          background: #f39c12;
          color: white;
        }

        .btn-edit:hover {
          background: #e67e22;
        }

        .btn-execute {
          background: #27ae60;
          color: white;
        }

        .btn-execute:hover {
          background: #229954;
        }

        .scripts-list-loading {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          font-size: 48px;
          margin-bottom: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 