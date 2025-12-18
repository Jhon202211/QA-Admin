// Interfaz para la respuesta del agente IA
export interface AITestCaseSuggestion {
  module: string;
  submodule: string;
  test_type: string; // Mapea a category
  test_cases: Array<{
    title: string;
    preconditions: string[];
    steps: string[];
    expected_result: string;
  }>;
}

const AI_PROMPT = `Eres un QA Lead Senior especializado en diseño de suites de pruebas manuales.

Tu tarea es analizar una Historia de Usuario y:

1. Identificar correctamente:
   - Módulo (área funcional principal, ej: "Accesos", "Reservas", "Pagos")
   - Submódulo o flujo (funcionalidad específica, ej: "Acceso QR", "Reserva de sala")
   - Tipo de prueba principal (Funcionales, Regresión, Smoke, No Funcionales, UAT)

2. Proponer la ubicación jerárquica correcta del caso de prueba siguiendo esta estructura:
   Proyecto > Módulo > Submódulo > Tipo de prueba > Caso de prueba

3. Guiar la creación de casos de prueba manuales:
   - Nombre claro y estandarizado
   - Precondiciones
   - Pasos detallados y secuenciales
   - Resultado esperado

4. Usar un lenguaje claro, profesional y orientado a QA manual.
5. No inventar reglas de negocio que no estén implícitas en la historia.
6. Sugerir casos positivos, negativos y de borde cuando aplique.
7. Mantener consistencia en nombres y evitar duplicidad.

Devuelve SOLO un JSON válido con esta estructura exacta:
{
  "module": "Nombre del módulo",
  "submodule": "Nombre del submódulo",
  "test_type": "Funcionales|Regresión|Smoke|No Funcionales|UAT",
  "test_cases": [
    {
      "title": "Nombre del caso de prueba",
      "preconditions": ["Precondición 1", "Precondición 2"],
      "steps": ["Paso 1", "Paso 2", "Paso 3"],
      "expected_result": "Resultado esperado claro y específico"
    }
  ]
}`;

// Función para obtener configuración de OpenAI desde localStorage
const getOpenAIConfig = () => {
  try {
    const config = localStorage.getItem('qaScopeConfig');
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.openaiEnabled && parsed.openaiApiKey) {
        return {
          apiKey: parsed.openaiApiKey,
          model: parsed.openaiModel || 'gpt-4o-mini'
        };
      }
    }
  } catch (e) {
    console.error('Error al leer configuración:', e);
  }
  return null;
};

export const generateTestCasesFromUserStory = async (
  userStory: string,
  apiKey?: string
): Promise<AITestCaseSuggestion> => {
  // Intentar usar OpenAI si está configurado
  const openAIConfig = getOpenAIConfig();
  const apiKeyToUse = apiKey || openAIConfig?.apiKey;
  
  if (apiKeyToUse && openAIConfig) {
    try {
      return await callOpenAI(userStory, apiKeyToUse, openAIConfig.model);
    } catch (error) {
      console.error('Error al llamar a OpenAI, usando simulación:', error);
      // Continuar con simulación si falla la API
    }
  }
  
  // Simulación temporal para desarrollo o cuando no hay API key configurada
  // Ejemplo con OpenAI:
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${apiKey}`
  //   },
  //   body: JSON.stringify({
  //     model: 'gpt-4',
  //     messages: [
  //       { role: 'system', content: AI_PROMPT },
  //       { role: 'user', content: userStory }
  //     ],
  //     temperature: 0.7,
  //     response_format: { type: 'json_object' }
  //   })
  // });
  
  // Simulación temporal para desarrollo
  return new Promise((resolve) => {
    setTimeout(() => {
      // Análisis básico de la historia de usuario
      const lowerStory = userStory.toLowerCase();
      let module = 'General';
      let submodule = 'Funcionalidad Principal';
      let testType = 'Funcionales';
      
      // Detección básica de módulos comunes
      if (lowerStory.includes('acceso') || lowerStory.includes('login') || lowerStory.includes('autenticación')) {
        module = 'Accesos';
        submodule = lowerStory.includes('qr') ? 'Acceso QR' : 'Autenticación';
      } else if (lowerStory.includes('reserva') || lowerStory.includes('reservar')) {
        module = 'Reservas';
        submodule = 'Gestión de Reservas';
      } else if (lowerStory.includes('pago') || lowerStory.includes('pagar')) {
        module = 'Pagos';
        submodule = 'Procesamiento de Pagos';
      } else if (lowerStory.includes('reporte') || lowerStory.includes('reportar')) {
        module = 'Reportes';
        submodule = 'Generación de Reportes';
      }
      
      // Detección de tipo de prueba
      if (lowerStory.includes('regresión') || lowerStory.includes('regresion')) {
        testType = 'Regresión';
      } else if (lowerStory.includes('smoke') || lowerStory.includes('humo')) {
        testType = 'Smoke';
      } else if (lowerStory.includes('performance') || lowerStory.includes('rendimiento')) {
        testType = 'No Funcionales';
      } else if (lowerStory.includes('uat') || lowerStory.includes('aceptación')) {
        testType = 'UAT';
      }
      
      // Extraer funcionalidad de la historia
      const wantMatch = userStory.match(/quiero\s+(.+?)(?:\s+para|$)/i);
      const functionality = wantMatch ? wantMatch[1].trim() : 'realizar una acción';
      
      // Generar casos básicos
      const testCases = [
        {
          title: `Validar ${functionality} - Caso positivo`,
          preconditions: [
            'El usuario tiene permisos necesarios',
            'El sistema está operativo'
          ],
          steps: [
            'Acceder a la funcionalidad',
            'Completar los campos requeridos',
            'Ejecutar la acción principal',
            'Verificar el resultado'
          ],
          expected_result: `La funcionalidad se ejecuta correctamente y se muestra el resultado esperado`
        }
      ];
      
      // Agregar caso negativo si es relevante
      if (!lowerStory.includes('solo positivo')) {
        testCases.push({
          title: `Validar ${functionality} - Caso negativo`,
          preconditions: [
            'El usuario tiene permisos necesarios',
            'El sistema está operativo'
          ],
          steps: [
            'Acceder a la funcionalidad',
            'Ingresar datos inválidos o incompletos',
            'Intentar ejecutar la acción',
            'Verificar el mensaje de error'
          ],
          expected_result: 'El sistema muestra un mensaje de error apropiado y no permite la acción'
        });
      }
      
      resolve({
        module,
        submodule,
        test_type: testType,
        test_cases: testCases
      });
    }, 1500); // Simular latencia de API
  });
};

// Función para llamar a OpenAI
export const callOpenAI = async (
  userStory: string,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<AITestCaseSuggestion> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: AI_PROMPT },
          { role: 'user', content: `Historia de Usuario:\n${userStory}` }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Error de API: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No se recibió respuesta de la IA');
    }

    // Parsear JSON de la respuesta
    const parsed = JSON.parse(content);
    return parsed as AITestCaseSuggestion;
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error);
    throw error;
  }
};

