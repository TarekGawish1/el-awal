import { apiClient } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { offlineDb } from '../../../lib/offline/db';
import { Booklet, CreateBookletInput, UpdateBookletInput } from '../types';

export async function fetchBookletsApi(query?: {
  gradeLevel?: string;
  groupId?: string;
  isActive?: boolean;
}): Promise<Booklet[]> {
  try {
    const params = new URLSearchParams();
    if (query?.gradeLevel) params.append('gradeLevel', query.gradeLevel);
    if (query?.groupId) params.append('groupId', query.groupId);
    if (query?.isActive !== undefined) params.append('isActive', String(query.isActive));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<any>(`${API_ENDPOINTS.BOOKLETS.LIST}${qs}`, {
      method: 'GET',
    });

    const data = (res?.data || res || []) as Booklet[];

    // Sync into IndexedDB cache in the background
    if (Array.isArray(data) && data.length > 0) {
      offlineDb.bulkPutBooklets(data as any[]).catch(() => {});
    }

    return data;
  } catch (error) {
    console.warn('Network error fetching booklets, falling back to IndexedDB:', error);
    const offlineList = await offlineDb.getBookletsOffline(query);
    return offlineList as Booklet[];
  }
}

export async function createBookletApi(input: CreateBookletInput): Promise<Booklet> {
  const res = await apiClient<any>(API_ENDPOINTS.BOOKLETS.CREATE, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const created = (res?.data || res) as Booklet;

  if (created && created.id) {
    offlineDb.putBooklet(created as any).catch(() => {});
  }

  return created;
}

export async function updateBookletApi(id: string, input: UpdateBookletInput): Promise<Booklet> {
  const res = await apiClient<any>(API_ENDPOINTS.BOOKLETS.UPDATE(id), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  const updated = (res?.data || res) as Booklet;

  if (updated && updated.id) {
    offlineDb.putBooklet(updated as any).catch(() => {});
  }

  return updated;
}

export async function deleteBookletApi(id: string): Promise<{ success: boolean; softDeleted?: boolean; message?: string }> {
  const res = await apiClient<any>(API_ENDPOINTS.BOOKLETS.DELETE(id), {
    method: 'DELETE',
  });

  offlineDb.removeBooklet(id).catch(() => {});

  return res?.data || res || { success: true };
}
