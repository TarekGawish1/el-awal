import { NextRequest, NextResponse } from 'next/server';

const DIRECT_HEROKU_URL = 'https://al-awal-cbe2188d9efa.herokuapp.com/api/v1';
const PUBLIC_API_URL = 'https://api.al-awal.online/api/v1';

function getBackendBaseUrl(): string {
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/+$/, '');
  }
  return process.env.NODE_ENV === 'production'
    ? DIRECT_HEROKU_URL
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/+$/, '');
}

async function proxyAuthRequest(request: NextRequest, pathSegments: string[]) {
  const pathStr = pathSegments.join('/');
  const backendBase = getBackendBaseUrl();
  const primaryUrl = `${backendBase}/auth/${pathStr}`;
  const fallbackUrl = `${PUBLIC_API_URL}/auth/${pathStr}`;

  // Forward client headers
  const forwardHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  const contentType = request.headers.get('content-type');
  if (contentType) forwardHeaders['Content-Type'] = contentType;

  const authHeader = request.headers.get('authorization');
  if (authHeader) forwardHeaders['Authorization'] = authHeader;

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) forwardHeaders['Cookie'] = cookieHeader;

  // Add tracing and forwarded origin headers
  const origin = request.headers.get('origin') || 'https://al-awal.online';
  forwardHeaders['Origin'] = origin;
  forwardHeaders['X-Forwarded-Host'] = request.headers.get('host') || 'al-awal.online';
  forwardHeaders['X-Forwarded-Proto'] = 'https';

  let body: string | undefined = undefined;
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    body = await request.text();
  }

  // Attempt primary backend URL, then fallback if network connection fails
  let backendResponse: Response | null = null;
  try {
    backendResponse = await fetch(primaryUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });
  } catch (primaryErr) {
    console.warn(`Primary auth proxy error for ${primaryUrl}:`, primaryErr);
    try {
      backendResponse = await fetch(fallbackUrl, {
        method: request.method,
        headers: forwardHeaders,
        body,
        redirect: 'manual',
      });
    } catch (fallbackErr) {
      console.error(`Fallback auth proxy error for ${fallbackUrl}:`, fallbackErr);
      return NextResponse.json(
        {
          success: false,
          statusCode: 503,
          error: 'SERVICE_UNAVAILABLE',
          message: 'تعذر الاتصال بخادم المصادقة، يرجى المحاولة مرة أخرى',
        },
        { status: 503 },
      );
    }
  }

  const responseBody = await backendResponse.text();
  const clientResponse = new NextResponse(responseBody, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
  });

  const respContentType = backendResponse.headers.get('content-type');
  if (respContentType) {
    clientResponse.headers.set('content-type', respContentType);
  }

  // Forward and normalize Set-Cookie headers for robust first-party storage
  // (getSetCookie supports multiple Set-Cookie headers in standard Web Fetch)
  const setCookies: string[] = typeof (backendResponse.headers as any).getSetCookie === 'function'
    ? (backendResponse.headers as any).getSetCookie()
    : [backendResponse.headers.get('set-cookie')].filter(Boolean) as string[];

  for (const cookieStr of setCookies) {
    if (!cookieStr) continue;

    // Normalize cookie for same-origin platform access (.al-awal.online)
    // Ensures SameSite=Lax (first-party immune to Brave shields and Safari ITP)
    // and adds Partitioned attribute for CHIPS
    let normalizedCookie = cookieStr;
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && !normalizedCookie.toLowerCase().includes('domain=')) {
      normalizedCookie += '; Domain=.al-awal.online';
    }
    if (isProd && !normalizedCookie.toLowerCase().includes('partitioned')) {
      normalizedCookie += '; Partitioned';
    }

    // Rewrite SameSite=None to SameSite=Lax on same-origin proxy to eliminate third-party blocking
    normalizedCookie = normalizedCookie.replace(/SameSite=None/gi, 'SameSite=Lax');

    clientResponse.headers.append('set-cookie', normalizedCookie);
  }

  return clientResponse;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await Promise.resolve(context.params);
  return proxyAuthRequest(request, resolvedParams.path || []);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await Promise.resolve(context.params);
  return proxyAuthRequest(request, resolvedParams.path || []);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
