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
}

export const testimonialsApi = {
  getMine: () => apiClient<Testimonial | null>('/testimonials/mine'),
  create: (payload: { content: string; rating: number }) =>
    apiClient<Testimonial>('/testimonials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAll: () => apiClient<Testimonial[]>('/testimonials'),
  update: (id: string, payload: Partial<Pick<Testimonial, 'content' | 'rating' | 'status'>>) =>
    apiClient<Testimonial>(`/testimonials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getPublic: () => apiClient<Testimonial[]>('/testimonials/public'),
};
