import { headers } from 'next/headers';

import LoginModal from '@/components/portfolio/login-modal';
import PortfolioCockpit from '@/components/portfolio/portfolio-cockpit';
import { isAuthenticated, isPasswordConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const requestHeaders = await headers();
  const authenticated = await isAuthenticated(requestHeaders.get('cookie'));
  if (!authenticated) return <LoginModal configured={isPasswordConfigured()} />;

  return <PortfolioCockpit />;
}
