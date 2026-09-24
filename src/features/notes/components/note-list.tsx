'use client';

import { useState } from 'react';
import { Note, Project, WorkExperience } from '@/types/database';
import { normalizeTags } from '@/lib/utils';
import { NoteCard } from './note-card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';

interface NoteListProps {
  initialNotes: Note[];
  projects: Project[];
  works?: WorkExperience[];
  tags?: string[];
}

export function NoteList({ initialNotes, projects, works = [], tags = [] }: NoteListProps) {
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created'>('updated');

  const projectsMap: Record<string, string> = {};
  projects.forEach((p) => {
    projectsMap[p.id] = p.name;
  });

  const filteredNotes = initialNotes
    .filter((note) => {
      // Project filter
      if (selectedProjectId !== 'all' && note.project_id !== selectedProjectId) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'all') {
        if (!normalizeTags(note.tags).map((t) => t.toLowerCase()).includes(selectedTag)) {
          return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(q);
        const contentMatch = note.content?.toLowerCase().includes(q);
        const tagMatch = normalizeTags(note.tags).some((t) => t.toLowerCase().includes(q));
        return titleMatch || contentMatch || tagMatch;
      }

      return true;
    })
    .sort((a, b) => {
      // Pinned notes float to the top within the current sort.
      if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
      const left = sortBy === 'updated' ? a.updated_at : a.created_at;
      const right = sortBy === 'updated' ? b.updated_at : b.created_at;
      return right.localeCompare(left);
    });

  if (initialNotes.length === 0) {
    return (
      <EmptyState
        title="No notes or knowledge items yet."
        description='Click "+ New Note" to capture structured knowledge and ideas.'
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes by title, content, or #tags..."
          className="flex-1 text-xs"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-auto text-xs"
            aria-label="Filter by project"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </Select>

          {tags.length > 0 && (
            <Select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-auto text-xs"
              aria-label="Filter by tag"
            >
              <option value="all">All Tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </Select>
          )}

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updated' | 'created')}
            className="w-auto text-xs"
            aria-label="Sort notes"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No notes match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              projectsMap={projectsMap}
              projects={projects}
              works={works}
            />
          ))}
        </div>
      )}
    </div>
  );
}
