'use client';

import { useState } from 'react';
import { Project, ProjectStatus } from '@/types/database';
import { ProjectCard } from './project-card';
import { EmptyState } from '@/components/common/empty-state';

interface ProjectListProps {
  initialProjects: Project[];
}

export function ProjectList({ initialProjects }: ProjectListProps) {
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all');

  const filteredProjects = initialProjects.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  if (initialProjects.length === 0) {
    return (
      <EmptyState
        title="No projects yet."
        description='Click "+ New Project" to organize your outcomes.'
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-3">
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
