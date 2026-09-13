'use client';

import { useState } from 'react';
import { Note, Project } from '@/types/database';
import { NoteCard } from './note-card';

interface NoteListProps {
  initialNotes: Note[];
  projects: Project[];
}

export function NoteList({ initialNotes, projects }: NoteListProps) {
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const projectsMap: Record<string, string> = {};
  projects.forEach((p) => {
    projectsMap[p.id] = p.name;
  });

  const filteredNotes = initialNotes.filter((note) => {
    // Project filter
    if (selectedProjectId !== 'all' && note.project_id !== selectedProjectId) {
      return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content?.toLowerCase().includes(q);
      const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagMatch;
    }

    return true;
  });

  if (initialNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/50">
        <p className="text-sm font-medium text-muted-foreground">No notes or knowledge items yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Click "+ New Note" to capture structured knowledge and ideas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Project Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-border pb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes by title, content, or #tags..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        />

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              📁 {p.name}
            </option>
          ))}
        </select>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
