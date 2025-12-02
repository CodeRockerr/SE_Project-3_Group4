import { cookies } from "next/headers";

async function handleRequest(req: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const url = req.url.split("?path=")[1];
  
  // Get cookie header from request to forward session cookies
  const cookieHeader = req.headers.get('Cookie') || '';

  const headers: HeadersInit = {};

  // Forward cookies for session management
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  // Add authorization token if available
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Get request body if present
  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
    const contentType = req.headers.get('Content-Type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
  }

  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), { status: 400 });
  }

  // Determine base URL. Prefer BACKEND_URL; fallback to NEXT_PUBLIC_API_BASE (strip trailing /api)
  // Default to http://localhost:4000 to match project README/backend default
  const rawBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
  const baseUrl = rawBackend.replace(/\/?api\/?$/i, '');
  const target = `${baseUrl}${decodeURIComponent(url)}`;

  let backendReq: Response;
  try {
    backendReq = await fetch(target, {
      method: req.method,
      headers,
      body,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: 'Upstream fetch failed',
        detail: (e as Error).message,
        target,
        backendBase: baseUrl,
        method: req.method,
      }),
      { status: 502 }
    );
  }

  // Create response and forward Set-Cookie headers for session management
  const responseHeaders = new Headers(backendReq.headers);
  
  // Forward Set-Cookie headers to client
  const setCookieHeaders = backendReq.headers.getSetCookie();
  if (setCookieHeaders.length > 0) {
    responseHeaders.delete('Set-Cookie');
    setCookieHeaders.forEach(cookie => {
      responseHeaders.append('Set-Cookie', cookie);
    });
  }

  const response = new Response(backendReq.body, {
    status: backendReq.status,
    statusText: backendReq.statusText,
    headers: responseHeaders,
  });

  return response;
}

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

export async function PATCH(req: Request) {
  return handleRequest(req);
}

export async function PUT(req: Request) {
  return handleRequest(req);
}

export async function DELETE(req: Request) {
  return handleRequest(req);
}
