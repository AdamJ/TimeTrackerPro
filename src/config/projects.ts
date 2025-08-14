export interface ProjectCategory {
  name: string;
  client: string;
  hourlyRate?: number;
  color: string;
}

export const DEFAULT_PROJECTS: ProjectCategory[] = [
  // {
  //   name: 'Project Name',
  //   client: 'Client / Company name',
  //   hourlyRate: In Dollars, no decimals,
  //   color: '#3B82F6'
  // },
  {
    name: 'CAS Product and Design',
    client: 'Component Assembly Systems',
    hourlyRate: 100,
    color: '#3B82F6'
  },
  {
    name: 'Structure Cloud',
    client: 'CF Data Systems',
    hourlyRate: 175,
    color: '#8B5CF6'
  }
];
