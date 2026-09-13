import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUnprocessedCaptures } from '@/features/captures/actions';
import { CaptureInput } from '@/features/captures/components/capture-input';
import { CaptureList } from '@/features/captures/components/capture-list';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Quick Capture',
  description: 'Quick distraction-free thought capture inbox.',
};

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const captures = await getUnprocessedCaptures();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Quick Capture</h1>
            <p className="text-sm text-muted-foreground">
              Externalize your thoughts immediately. Process them later.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        </div>

        {/* Input Section */}
        <section>
          <CaptureInput />
        </section>

        {/* Unprocessed Inbox List */}
        <section>
          <CaptureList initialCaptures={captures} />
        </section>
      </div>
    </div>
  );
}
