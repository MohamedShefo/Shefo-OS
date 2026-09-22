import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import {
  getNoteById,
  getNoteBlocks,
  getOutgoingNoteLinks,
  getIncomingNoteLinks,
  getNotes,
} from '@/features/notes/actions';
import { getProjects } from '@/features/projects/actions';
import { getWorkExperiences } from '@/features/work/actions';
import { getNoteSkills, getSkills } from '@/features/skills/actions';
import { getTasksByNote } from '@/features/tasks/actions';
import { getUnprocessedCaptures } from '@/features/captures/actions';
import { NoteDetail } from '@/features/notes/components/note-detail';
import { NoteMetaEditor } from '@/features/notes/components/note-meta-editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Note Details',
  description: 'Structured note workspace with blocks and links.',
};

interface NoteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const note = await getNoteById(id);
  if (!note) {
    notFound();
  }

  const [blocks, outgoing, incoming, allNotes, linkedSkills, allSkills, linkedTasks, projects, works, captures] =
    await Promise.all([
      getNoteBlocks(id),
      getOutgoingNoteLinks(id),
      getIncomingNoteLinks(id),
      getNotes(),
      getNoteSkills(id),
      getSkills(),
      getTasksByNote(id),
      getProjects(),
      getWorkExperiences(),
      getUnprocessedCaptures(),
    ]);

  const projectsMap: Record<string, string> = {};
  projects.forEach((p) => {
    projectsMap[p.id] = p.name;
  });
  const worksMap: Record<string, string> = {};
  works.forEach((w) => {
    worksMap[w.id] = w.organization;
  });
  const sourceCapture = note.source_capture_id
    ? captures.find((c) => c.id === note.source_capture_id) ?? null
    : null;

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title={note.title}
        description="Structured note workspace — blocks, links, skills, and relations."
        actions={
          <>
            <Link href="/notes">
              <Button variant="outline" size="sm">
                All Notes
              </Button>
            </Link>
            {note.note_type && note.note_type !== 'note' && (
              <Badge variant="secondary" className="capitalize">
                {note.note_type}
              </Badge>
            )}
          </>
        }
      />

      <NoteMetaEditor
        note={note}
        projects={projects}
        works={works}
        projectsMap={projectsMap}
        worksMap={worksMap}
      />

      <section>
        <NoteDetail
          note={note}
          blocks={blocks}
          outgoing={outgoing}
          incoming={incoming}
          allNotes={allNotes.filter((n) => n.id !== note.id)}
          linkedSkills={linkedSkills}
          allSkills={allSkills}
          linkedTasks={linkedTasks}
          projects={projects}
          works={works}
          projectsMap={projectsMap}
          worksMap={worksMap}
          sourceCaptureText={
            sourceCapture
              ? sourceCapture.raw_text.length > 80
                ? `${sourceCapture.raw_text.slice(0, 80)}…`
                : sourceCapture.raw_text
              : null
          }
        />
      </section>
    </AppShell>
  );
}
