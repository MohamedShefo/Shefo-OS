'use client';

import { useState } from 'react';
import { Project, ProjectStatus } from '@/types/database';
import { ProjectCard } from './project-card';
import { EmptyState } from '@/components/common/empty-state';
import { SearchField } from '@/components/common/search-field';
import { matchesQuery } from '@/lib/search';

interface ProjectListProps {
  initialProjects: Project[];
  heading?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProjectList({
  initialProjects,
  heading,
  emptyTitle = 'No projects yet.',
  emptyDescription = 'Click "+ New Project" to organize your outcomes.',
}: ProjectListProps) {
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all');
  const [search, setSearch] = useState('');

  const filteredProjects = initialProjects.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    return matchesQuery([p.name, p.description], search);
  });

  if (initialProjects.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'active', 'paused', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                filter === tab
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <SearchField value={search} onChange={setSearch} placeholder="Search projects…" />
      </div>

      {heading && (
        <h2 className="text-sm font-semibold tracking-tight text-foreground px-1">{heading}</h2>
      )}

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No projects match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
