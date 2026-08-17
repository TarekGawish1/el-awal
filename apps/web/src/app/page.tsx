import { redirect } from 'next/navigation';

/**
 * Root Landing Page
 * Server-redirects to /login where client-side session routing determines role destination
 */
export default function RootPage() {
  redirect('/login');
}
