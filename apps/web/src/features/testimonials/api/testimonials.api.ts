import { apiClient } from '@/lib/api/client';

export type TestimonialStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Testimonial {
  id: string;
  content: string;
  rating: number;
  status: TestimonialStatus;
  firstName: string;
  gradeLevel?: string | null;
  fullName?: string;
  createdAt: string;
  updatedAt?: string;
  moderatedAt?: string | null;
  displayName?: string | null;
}

export const testimonialsApi = {
  getMine: () => apiClient<Testimonial | null>('/testimonials/mine'),
  saveMine: (payload: { content: string; rating: number }) =>
    apiClient<Testimonial>('/testimonials/mine', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getAll: () => apiClient<Testimonial[]>('/testimonials'),
  createManual: (payload: { displayName: string; gradeLevel?: string; content: string; rating: number; status?: TestimonialStatus }) =>
    apiClient<Testimonial>('/testimonials/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<Pick<Testimonial, 'content' | 'rating' | 'status'>>) =>
    apiClient<Testimonial>(`/testimonials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getPublic: () => apiClient<Testimonial[]>('/testimonials/public'),
};
