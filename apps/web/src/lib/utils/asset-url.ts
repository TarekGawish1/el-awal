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
