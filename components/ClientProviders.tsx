'use client';

import { PwaRegister } from './pwa-register';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister />
      {children}
    </>
  );
}