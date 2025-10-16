export interface ProjectCategory {
  name: string;
  client: string;
  hourlyRate?: number;
  color: string;
  isBillable?: boolean;
}

export const DEFAULT_PROJECTS: ProjectCategory[] = [
  // {
  //   name: 'Project Name',
  //   client: 'Client / Company name',
  //   hourlyRate: In Dollars, no decimals,
  //   color: '#3B82F6',
  //   isBillable: true
  // },
  {
    name: 'Product and Design',
    client: 'CAS',
    hourlyRate: 100,
    color: '#3B82F6',
    isBillable: true
  },
  {
    name: 'Personal',
    client: 'AJ',
    hourlyRate: 100,
    color: '#8B5CF6',
    isBillable: false
  }
];
