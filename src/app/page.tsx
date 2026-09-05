import { createClient } from '@/utils/supabase/server';
import { logout } from './auth-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-2xl">
        <h1 className="text-3xl font-bold">Shefo OS</h1>
        
        {user ? (
          <div className="flex flex-col gap-4 w-full">
            <p className="text-lg">Welcome back, {user.email}</p>
            <div className="p-4 border rounded-md bg-card text-card-foreground">
              <p className="text-sm text-muted-foreground mb-4">Authenticated session active.</p>
              <form action={logout}>
                <Button variant="outline" type="submit">Sign Out</Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary">Create Account</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
