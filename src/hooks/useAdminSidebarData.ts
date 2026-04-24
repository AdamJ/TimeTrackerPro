import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface AdminSidebarMember {
  userId: string;
  name: string;
  initial: string;
  color: string;
}

export interface AdminSidebarProject {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  color: string;
}

export interface AdminSidebarBundle {
  organizationName: string;
  members: AdminSidebarMember[];
  activeProjects: AdminSidebarProject[];
  archivedProjects: AdminSidebarProject[];
}

interface MembershipRow {
  user_id: string;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
}

const MEMBER_COLORS = ['#53BD8C', '#F97316', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6', '#F59E0B'];
const PROJECT_COLORS = ['#22C55E', '#3B82F6', '#EF4444', '#F97316', '#8B5CF6', '#14B8A6', '#EAB308', '#6366F1'];

function getDisplayName(profile: ProfileRow): string {
  return profile.display_name || profile.username || profile.email || '未命名成员';
}

async function fetchSidebarData(userId: string): Promise<AdminSidebarBundle> {
  const tt = supabase.schema('time_tracker');

  const { data: currentMembership, error: currentMembershipError } = await tt
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('employment_status', 'active')
    .limit(1)
    .maybeSingle();

  if (currentMembershipError) {
    throw currentMembershipError;
  }

  if (!currentMembership?.org_id) {
    return {
      organizationName: '未加入组织',
      members: [],
      activeProjects: [],
      archivedProjects: [],
    };
  }

  const orgId = currentMembership.org_id;

  const [organizationRes, membersRes, projectsRes] = await Promise.all([
    tt.from('organizations').select('name').eq('id', orgId).maybeSingle(),
    tt.from('org_members').select('user_id').eq('org_id', orgId).eq('employment_status', 'active').order('joined_at', { ascending: true }),
    tt.from('projects').select('id, name, status').eq('org_id', orgId).order('created_at', { ascending: false }),
  ]);

  if (organizationRes.error) throw organizationRes.error;
  if (membersRes.error) throw membersRes.error;

  const memberUserIds = (membersRes.data ?? []).map((row: MembershipRow) => row.user_id);
  let profiles: ProfileRow[] = [];

  if (memberUserIds.length > 0) {
    const { data: profileRows, error: profileError } = await tt
      .from('v_user_profiles')
      .select('id, display_name, username, email')
      .in('id', memberUserIds);

    if (profileError) throw profileError;
    profiles = profileRows ?? [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const members = memberUserIds.map((memberId, index) => {
    const profile = profileMap.get(memberId);
    const name = profile ? getDisplayName(profile) : '未命名成员';
    return {
      userId: memberId,
      name,
      initial: name.trim().charAt(0).toUpperCase() || '?',
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    };
  });

  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const decorateProject = (project: ProjectRow, index: number): AdminSidebarProject => ({
    id: project.id,
    name: project.name,
    status: project.status,
    color: PROJECT_COLORS[index % PROJECT_COLORS.length],
  });

  return {
    organizationName: organizationRes.data?.name || '未命名组织',
    members,
    activeProjects: projects.filter((project) => project.status === 'active').map(decorateProject),
    archivedProjects: projects.filter((project) => project.status === 'archived').map(decorateProject),
  };
}

export function useAdminSidebarData() {
  const { user, isAuthenticated, loading } = useAuth();

  return useQuery({
    queryKey: ['admin-sidebar', user?.id ?? null],
    queryFn: () => fetchSidebarData(user!.id),
    enabled: !loading && isAuthenticated && !!user?.id,
    staleTime: 60_000,
  });
}
