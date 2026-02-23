import { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthCardProps {
  title: string;
  description: string;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
  children: ReactNode;
}

export function AuthCard({
  title,
  description,
  footerText,
  footerHref,
  footerLinkLabel,
  children,
}: AuthCardProps) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__glow" />
      <Card className="auth-card">
        <CardHeader className="space-y-2 pb-2 text-center">
          <CardTitle className="text-3xl tracking-tight">{title}</CardTitle>
          <CardDescription className="text-[15px]">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
          <div className="auth-footer">
            {footerText}{' '}
            <Link href={footerHref}>
              {footerLinkLabel}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
