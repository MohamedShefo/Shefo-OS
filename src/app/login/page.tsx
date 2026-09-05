import Link from 'next/link';
import { login } from '@/app/auth-actions';
import { Button } from '@/components/ui/button';

export default async function Login(props: { searchParams: Promise<{ message?: string }> }) {
  const searchParams = await props.searchParams;
  const message = searchParams?.message;

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 m-auto mt-20">
      <form
        className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
        action={login}
      >
        <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back to Shefo OS</h1>
          <p className="text-sm text-muted-foreground">Enter your email and password to sign in</p>
        </div>

        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          name="email"
          placeholder="you@example.com"
          required
        />
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />

        <Button type="submit">Sign In</Button>

        {message && (
          <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center rounded-md">
            {message}
          </p>
        )}

        <div className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Link href="/signup" className="underline underline-offset-4">
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}
