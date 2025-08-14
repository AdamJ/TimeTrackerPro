export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export const DEFAULT_CATEGORIES: TaskCategory[] = [
  {
    id: 'project-management',
    name: 'Project Management',
    color: '#3B82F6',
    description: 'Planning, coordination, and administrative tasks'
  },
  {
    id: 'design',
    name: 'Design',
    color: '#8B5CF6',
    description: 'UI/UX design, wireframing, and visual work'
  },
  {
    id: 'development',
    name: 'Development',
    color: '#10B981',
    description: 'Coding, programming, and technical implementation'
  },
  {
    id: 'testing',
    name: 'Testing',
    color: '#F59E0B',
    description: 'Quality assurance, debugging, and testing'
  },
  {
    id: 'documentation',
    name: 'Documentation',
    color: '#6B7280',
    description: 'Writing docs, comments, and technical writing'
  },
  {
    id: 'meetings',
    name: 'Meetings',
    color: '#EF4444',
    description: 'Client calls, team meetings, and discussions'
  },
  {
    id: 'research',
    name: 'Research',
    color: '#06B6D4',
    description: 'Investigation, learning, and analysis'
  },
  {
    id: 'break-time',
    name: 'Break Time',
    color: '#84CC16',
    description: 'Lunch, coffee breaks, and personal time'
  },
  {
    id: 'admin',
    name: 'Administrative',
    color: '#F97316',
    description: 'Invoicing, emails, and business administration'
  }
];
