'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function LoginModal({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError(response.status === 503 ? 'Der Zugang ist noch nicht konfiguriert.' : 'Das Passwort ist nicht korrekt.');
        return;
      }

      window.location.reload();
    } catch {
      setError('Die Anmeldung ist gerade nicht erreichbar. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#EDEFEA] text-[#17211E]">
      <div aria-hidden="true" className="absolute inset-0 opacity-50 blur-[2px]">
        <div className="h-16 border-b border-[#D5DAD3] bg-white" />
        <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[168px_1fr]">
          <div className="border-r border-[#D5DAD3] bg-[#E9ECE7]" />
          <div className="grid content-start gap-5 p-8">
            <div className="h-28 rounded-sm border border-[#D5DAD3] bg-white" />
            <div className="grid grid-cols-3 gap-5">
              <div className="h-44 rounded-sm border border-[#D5DAD3] bg-white" />
              <div className="h-44 rounded-sm border border-[#D5DAD3] bg-white" />
              <div className="h-44 rounded-sm border border-[#D5DAD3] bg-white" />
            </div>
          </div>
        </div>
      </div>

      <Dialog open>
        <DialogContent
          showCloseButton={false}
          className="max-w-[420px] gap-0 overflow-hidden rounded-md border border-[#C9D0C9] bg-white p-0 shadow-[0_24px_80px_rgba(23,33,30,0.2)]"
        >
          <DialogHeader className="gap-3 border-b border-[#E3E7E1] px-6 pb-5 pt-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#E4E9F4] text-[#27407F]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-xl font-semibold tracking-[-0.02em]">Portfolio-Cockpit</DialogTitle>
              <DialogDescription className="text-[#5F6C68]">
                Dieser Arbeitsbereich ist geschützt. Bitte Passwort eingeben, um fortzufahren.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4 px-6 py-5">
            <label className="grid gap-2 text-sm font-medium" htmlFor="dashboard-password">
              Passwort
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7A8681]" aria-hidden="true" />
                <Input
                  id="dashboard-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="h-10 rounded-sm border-[#C9D0C9] bg-white pl-9"
                  disabled={!configured || submitting}
                />
              </div>
            </label>

            {error && <p id="login-error" role="alert" className="text-sm text-[#98392D]">{error}</p>}
            {!configured && <p role="alert" className="text-sm text-[#98392D]">Der Zugang ist noch nicht konfiguriert.</p>}

            <Button type="submit" className="h-10 w-full rounded-sm bg-[#27407F] hover:bg-[#1F356E]" disabled={!configured || submitting || !password}>
              {submitting ? 'Wird geprüft …' : 'Cockpit öffnen'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
