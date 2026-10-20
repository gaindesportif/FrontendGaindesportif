import type { Metadata } from 'next';
import { AdminSession } from '@/components/admin/admin-session';

export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default function AdministrationLayout({ children }: { children: React.ReactNode }) {
  return <AdminSession>{children}</AdminSession>;
}
