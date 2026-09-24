'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Note, NoteBlock, Project, Skill, Task, WorkExperience } from '@/types/database';
import type { LinkedNote } from '../actions';
import { BlocksEditor } from './blocks-editor';
import { NoteLinksManager } from './note-links-manager';
import { NoteSkillsManager } from './note-skills-manager';
import { NoteGraph, type GraphNeighbor } from './note-graph';
import { buildTitleMap, findWikilinkOutgoing, renderWikilinks } from '../wikilinks';
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
  related: Note[];
  wikilinkBacklinks: Array<{ id: string; title: string }>;
  projects: Project[];
  works: WorkExperience[];
  projectsMap: Record<string, string>;
  worksMap: Record<string, string>;
  sourceCaptureText: string | null;
  sourceCaptureId: string | null;
}

type ViewMode = 'read' | 'edit' | 'split';

function renderBlockContent(
  b: NoteBlock,
  linkify: (text: string) => React.ReactNode
): React.ReactNode {
  const text = b.content ?? '';
  if (b.block_type === 'heading') {
    return <h3 className="text-base font-bold tracking-tight text-foreground">{linkify(text)}</h3>;
  }
  if (b.block_type === 'list') {
    return (
      <ul className="space-y-1">
        {text.split('\n').map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
            <span aria-hidden="true" className="text-muted-foreground">
              •
            </span>
            <span className="whitespace-pre-wrap">{linkify(line.replace(/^•\s?/, ''))}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{linkify(text)}</p>;
}

export function NoteDetail(props: NoteDetailProps) {
  const { note, blocks, outgoing, incoming, allNotes, linkedSkills, allSkills, linkedTasks, related, wikilinkBacklinks } = props;
  const [mode, setMode] = useState<ViewMode>('read');
  const [graphOpen, setGraphOpen] = useState(true);
  const tags = normalizeTags(note.tags);
  const titleMap = buildTitleMap(allNotes.filter((n) => n.id !== note.id));
  const linkify = (text: string) => renderWikilinks(text, titleMap);
  const manualIds = new Set([...outgoing.map((l) => l.note.id), ...incoming.map((l) => l.note.id)]);
  const mentions = wikilinkBacklinks.filter((w) => !manualIds.has(w.id));
  const outgoingMentions = findWikilinkOutgoing(
    note.id,
    [note.content, ...blocks.map((b) => b.content)],
    titleMap
  );

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
    ...mentions.map((w) => ({
      key: `wiki-in-${w.id}`,
      label: w.title,
      kind: 'note' as const,
      href: `/notes/${w.id}`,
    })),
    ...outgoingMentions
      .filter((m) => !outgoing.some((l) => l.note.id === m.id))
      .map((m) => ({
        key: `wiki-out-${m.id}`,
        label: m.title,
        kind: 'note' as const,
        href: `/notes/${m.id}`,
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
    ...(props.sourceCaptureId
      ? [
          {
            key: `capture-${props.sourceCaptureId}`,
            label: props.sourceCaptureText ?? 'Source capture',
            kind: 'capture' as const,
            href: '/capture',
          },
        ]
      : []),
  ];

  const readPane = (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
      <p className="text-[11px] text-muted-foreground">
        Created {new Date(note.created_at).toLocaleString()} · Updated{' '}
        {new Date(note.updated_at).toLocaleString()}
      </p>
      {blocks.length === 0 ? (
        note.content ? (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{linkify(note.content)}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Empty note. Switch to Edit to add blocks.
          </p>
        )
      ) : (
        blocks.map((b) => <div key={b.id}>{renderBlockContent(b, linkify)}</div>)
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
      {(note.project_id || note.work_experience_id) && (
        <div className="flex flex-wrap items-center gap-1.5 px-1" aria-label="Related">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Related:
          </span>
          {note.project_id && props.projectsMap[note.project_id] && (
            <Link
              href={`/projects/${note.project_id}`}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:underline"
            >
              📁 {props.projectsMap[note.project_id]}
            </Link>
          )}
          {note.work_experience_id && props.worksMap[note.work_experience_id] && (
            <Link
              href={`/work/${note.work_experience_id}`}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:underline"
            >
              💼 {props.worksMap[note.work_experience_id]}
            </Link>
          )}
        </div>
      )}

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

      {/* Workspace split: note content alongside the live graph (stacks on mobile). */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        <div className="min-w-0 space-y-6">
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
        </div>
        {graphOpen && (
          <aside
            aria-label="Note graph"
            className="min-w-0 xl:sticky xl:top-4 space-y-2 animate-in fade-in duration-150"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Graph
            </h3>
            <NoteGraph centerLabel={note.title} neighbors={neighbors} />
          </aside>
        )}
      </div>

      <NoteLinksManager noteId={note.id} outgoing={outgoing} incoming={incoming} allNotes={allNotes} />

      {mentions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mentioned In
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mentions.map((w) => (
              <Link
                key={w.id}
                href={`/notes/${w.id}`}
                className="rounded-lg border border-border/60 p-2.5 transition-colors hover:border-ring/40"
              >
                <p className="text-xs font-medium text-foreground truncate">{w.title}</p>
                <p className="text-[11px] text-muted-foreground">references this note with [[…]]</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Related Notes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/notes/${r.id}`}
                className="rounded-lg border border-border/60 p-2.5 transition-colors hover:border-ring/40"
              >
                <p className="text-xs font-medium text-foreground truncate">
                  {r.is_pinned && <span aria-hidden="true">📌 </span>}
                  {r.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Updated {new Date(r.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
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
          📥 Created from capture:{' '}
          <Link href="/capture" className="text-primary hover:underline">
            “{props.sourceCaptureText}”
          </Link>
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
