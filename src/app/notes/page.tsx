import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getNotes } from '@/features/notes/actions';
import { getProjects } from '@/features/projects/actions';
import { NoteList } from '@/features/notes/components/note-list';
import { CreateNoteDialog } from '@/features/notes/components/create-note-dialog';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Notes & Concepts',
  description: 'Structured knowledge items and notes management.',
};

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [notes, projects] = await Promise.all([getNotes(), getProjects()]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Notes & Concepts</h1>
            <p className="text-sm text-muted-foreground">
              Externalize knowledge, meeting notes, and core concepts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <CreateNoteDialog projects={projects} />
          </div>
        </div>

        {/* Note List / Grid */}
        <section>
          <NoteList initialNotes={notes} projects={projects} />
        </section>
      </div>
    </div>
  );
}
