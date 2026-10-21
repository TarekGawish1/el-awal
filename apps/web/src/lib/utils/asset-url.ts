'use client';

import { API_BASE_URL } from '@/lib/api/endpoints';

export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const normalized = url.replace('/uploads/uploads/', '/uploads/');
  if (normalized.startsWith('http')) return normalized;
  const cleanBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${cleanBase}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

export function resolveCoverUrl(url?: string | null): string {
  return resolveAssetUrl(url);
}

export function isOptimizableImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'r2.dev' || hostname.endsWith('.r2.dev');
  } catch {
    return false;
  }
}

