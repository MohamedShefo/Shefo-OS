import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      const url = request.nextUrl.clone();
      url.pathname = next;
      url.searchParams.delete('token_hash');
      url.searchParams.delete('type');
      return NextResponse.redirect(url);
    }
  }

  // return the user to an error page with some instructions
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('message', 'Could not verify email');
  return NextResponse.redirect(url);
}
