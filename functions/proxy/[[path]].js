/**
 * Cloudflare Pages Function — Proxy LLM
 *
 * Intercepta /proxy/{service}/{...resto} y reenvía la petición al
 * endpoint real del proveedor LLM correspondiente.
 *
 * Rutas soportadas:
 *   /proxy/openai/**    →  https://api.openai.com/**
 *   /proxy/ollama/**    →  https://ollama.com/**
 *   /proxy/deepseek/**  →  https://api.deepseek.com/**
 */

const SERVICE_URLS = {
  openai:   'https://api.openai.com',
  ollama:   'https://ollama.com',
  deepseek: 'https://api.deepseek.com',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest({ request, params }) {
  // Preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const pathParts = params.path ?? [];
  const [service, ...rest] = pathParts;

  const baseUrl = SERVICE_URLS[service];
  if (!baseUrl) {
    return new Response(
      JSON.stringify({ error: `Servicio desconocido: ${service}` }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const targetUrl = `${baseUrl}/${rest.join('/')}`;

  // Reenviar solo las cabeceras relevantes
  const forwardHeaders = new Headers();
  const auth        = request.headers.get('Authorization');
  const contentType = request.headers.get('Content-Type');
  if (auth)        forwardHeaders.set('Authorization', auth);
  if (contentType) forwardHeaders.set('Content-Type', contentType);

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method:  request.method,
      headers: forwardHeaders,
      body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Error al contactar ${service}: ${err.message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));

  return new Response(upstream.body, {
    status:     upstream.status,
    statusText: upstream.statusText,
    headers:    responseHeaders,
  });
}
