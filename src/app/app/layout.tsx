import AppLayoutShell from '@/components/shared/AppLayoutShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutShell>{children}</AppLayoutShell>;
}
