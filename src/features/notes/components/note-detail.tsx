'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Note, NoteBlock, Project, Skill, Task, WorkExperience } from '@/types/database';
import type { LinkedNote } from '../actions';
import { BlocksEditor } from './blocks-editor';
import { NoteLinksManager } from './note-links-manager';
import { NoteSkillsManager } from './note-skills-manager';
import { NoteGraph, type GraphNeighbor } from './note-graph';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { normalizeTags } from '@/lib/utils';

interface NoteDetailProps {
  note: Note;
  blocks: NoteBlock[];
  outgoing: LinkedNote[];
  incoming: LinkedNote[];
  allNotes: Note[];
  linkedSkills: Skill[];
  allSkills: Skill[];
  linkedTasks: Task[];
  projects: Project[];
  works: WorkExperience[];
  projectsMap: Record<string, string>;
  worksMap: Record<string, string>;
  sourceCaptureText: string | null;
}

type ViewMode = 'read' | 'edit' | 'split';

function renderBlockContent(b: NoteBlock): React.ReactNode {
  const text = b.content ?? '';
  if (b.block_type === 'heading') {
    return <h3 className="text-base font-bold tracking-tight text-foreground">{text}</h3>;
  }
  if (b.block_type === 'list') {
    return (
      <ul className="space-y-1">
        {text.split('\n').map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
            <span aria-hidden="true" className="text-muted-foreground">
              •
            </span>
            <span className="whitespace-pre-wrap">{line.replace(/^•\s?/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{text}</p>;
}

export function NoteDetail(props: NoteDetailProps) {
  const { note, blocks, outgoing, incoming, allNotes, linkedSkills, allSkills, linkedTasks } = props;
  const [mode, setMode] = useState<ViewMode>('read');
  const [graphOpen, setGraphOpen] = useState(false);
  const tags = normalizeTags(note.tags);

  const neighbors: GraphNeighbor[] = [
    ...outgoing.map((l) => ({
      key: `out-${l.linkId}`,
      label: l.note.title,
      kind: 'note' as const,
      href: `/notes/${l.note.id}`,
    })),
    ...incoming.map((l) => ({
      key: `in-${l.linkId}`,
      label: l.note.title,
      kind: 'note' as const,
      href: `/notes/${l.note.id}`,
    })),
    ...linkedSkills.map((s) => ({
      key: `skill-${s.id}`,
      label: s.name,
      kind: 'skill' as const,
      href: '/skills',
    })),
    ...linkedTasks.map((t) => ({
      key: `task-${t.id}`,
      label: t.title,
      kind: 'task' as const,
      href: '/tasks',
    })),
    ...(note.project_id && props.projectsMap[note.project_id]
      ? [
          {
            key: `project-${note.project_id}`,
            label: props.projectsMap[note.project_id],
            kind: 'project' as const,
            href: `/projects/${note.project_id}`,
          },
        ]
      : []),
    ...(note.work_experience_id && props.worksMap[note.work_experience_id]
      ? [
          {
            key: `work-${note.work_experience_id}`,
            label: props.worksMap[note.work_experience_id],
            kind: 'work' as const,
            href: `/work/${note.work_experience_id}`,
          },
        ]
      : []),
  ];

  const readPane = (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
      {blocks.length === 0 ? (
        note.content ? (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{note.content}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Empty note. Switch to Edit to add blocks.
          </p>
        )
      ) : (
        blocks.map((b) => <div key={b.id}>{renderBlockContent(b)}</div>)
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        {(['read', 'edit', 'split'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
              mode === m
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {m === 'split' ? 'Split view' : m}
          </button>
        ))}
        <span className="flex-1" />
        <button
          onClick={() => setGraphOpen((v) => !v)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            graphOpen
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
          }`}
        >
          {graphOpen ? 'Hide graph' : 'Show graph'}
        </button>
      </div>

      {graphOpen && (
        <div className="flex justify-center animate-in fade-in duration-150">
          <NoteGraph centerLabel={note.title} neighbors={neighbors} />
        </div>
      )}

      {mode === 'read' && readPane}
      {mode === 'edit' && <BlocksEditor noteId={note.id} initialBlocks={blocks} />}
      {mode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="min-w-0">{readPane}</div>
          <div className="min-w-0">
            <BlocksEditor noteId={note.id} initialBlocks={blocks} />
          </div>
        </div>
      )}

      <NoteLinksManager noteId={note.id} outgoing={outgoing} incoming={incoming} allNotes={allNotes} />
      <NoteSkillsManager noteId={note.id} linkedSkills={linkedSkills} allSkills={allSkills} />

      {linkedTasks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Linked Tasks
            <Badge variant="secondary">{linkedTasks.length}</Badge>
          </h3>
          {linkedTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2.5 text-xs"
            >
              <span className="font-medium text-foreground truncate">{t.title}</span>
              <Link href="/tasks" className="text-primary hover:underline shrink-0">
                Open →
              </Link>
            </div>
          ))}
        </div>
      )}

      {props.sourceCaptureText && (
        <p className="text-[11px] text-muted-foreground px-1">
          📥 Created from capture: “{props.sourceCaptureText}”
        </p>
      )}

      <div className="flex items-center justify-start">
        <Link href="/notes">
          <Button variant="outline" size="sm">
            ← All Notes
          </Button>
        </Link>
      </div>
    </div>
  );
}
