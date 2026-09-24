'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { logSecurityEvent } from '@/features/security/events';
import { ensurePersonalWorkspace } from '@/features/workspaces/actions';
import { ensureProfile } from '@/features/profile/actions';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await logSecurityEvent('auth.login_failed', {});
    redirect('/login?message=Could not authenticate user');
  }

  await logSecurityEvent('auth.login_success', {});
  // First-run provisioning: profile row + personal workspace (idempotent).
  await ensureProfile();
  await ensurePersonalWorkspace();

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect('/signup?message=Could not create user');
  }

  await logSecurityEvent('auth.signup', {});
  redirect('/login?message=Check email to continue sign in process');
}

export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logSecurityEvent('auth.logout', {});
  }
  await supabase.auth.signOut();
  // Belt-and-braces: make sure the Supabase session cookies are actually
  // gone even if the client's cookie write path was swallowed upstream.
  // Without this (or fresh route data), the router can re-render the cached
  // authenticated view and logout appears to do nothing.
  try {
    const store = await cookies();
    for (const c of store.getAll()) {
      if (c.name.startsWith('sb-') && c.name.includes('auth-token')) {
        store.delete(c.name);
      }
    }
  } catch {
    // Cookie store unavailable — signOut already attempted above.
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}
