'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchUsers, fetchResources, deleteResource } from '@/lib/features/admin/adminSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserLabel } from '@/components/ui/user-label';
import { toast } from 'sonner';

/* ── Fully-themed custom select ─────────────────────────────────────── */
function ThemeSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          height: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0 0.75rem',
          borderRadius: '0.375rem',
          border: `1px solid oklch(0.68 0.24 280 / ${open ? '80%' : '45%'})`,
          background: 'oklch(0.155 0.026 272)',
          color: 'oklch(0.82 0.12 280)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: open ? '0 0 0 2px oklch(0.68 0.24 280 / 25%)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          outline: 'none',
          minWidth: '6rem',
          justifyContent: 'space-between',
        }}
      >
        <span>{selected?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '100%',
            zIndex: 50,
            background: 'oklch(0.155 0.026 272)',
            border: '1px solid oklch(0.68 0.24 280 / 40%)',
            borderRadius: '0.375rem',
            boxShadow: '0 8px 24px oklch(0 0 0 / 50%), 0 0 0 1px oklch(0.68 0.24 280 / 12%) inset',
            overflow: 'hidden',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.4rem 0.75rem',
                textAlign: 'left',
                fontSize: '0.875rem',
                cursor: 'pointer',
                border: 'none',
                outline: 'none',
                background: opt.value === value
                  ? 'oklch(0.68 0.24 280 / 22%)'
                  : 'transparent',
                color: opt.value === value
                  ? 'oklch(0.88 0.18 280)'
                  : 'oklch(0.85 0.02 272)',
                fontWeight: opt.value === value ? 500 : 400,
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'oklch(0.68 0.24 280 / 12%)';
                  e.currentTarget.style.color = 'oklch(0.88 0.12 280)';
                }
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'oklch(0.85 0.02 272)';
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getRoleLabel(role: number): string {
  switch (role) {
    case 0: return 'Student';
    case 1: return 'Moderator';
    case 2: return 'Admin';
    case 3: return 'Super Admin';
    default: return `Unknown (${role})`;
  }
}

function getVisibilityBadge(isPublic: boolean) {
  return isPublic ? 'Public' : 'Private';
}

type Section = 'overview' | 'users' | 'resources';

const NAV_ITEMS: Array<{ key: Section; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'resources', label: 'Resources' },
];

function OverviewPanel() {
  const users = useAppSelector((state) => state.admin.users);
  const resources = useAppSelector((state) => state.admin.resources);

  const archivedCount = resources.filter((r) => r.is_archived).length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{users.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resources.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Archived</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{archivedCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersPanel() {
  const users = useAppSelector((state) => state.admin.users);
  const loading = useAppSelector((state) => state.admin.usersLoading);
  const error = useAppSelector((state) => state.admin.usersError);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users found.</p>;
  }

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">Users</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Name</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Email</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Role</th>
            <th className="text-left py-2 font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/50">
              <td className="py-2 pr-4">{user.full_name || user.email}</td>
              <td className="py-2 pr-4 text-muted-foreground">{user.email}</td>
              <td className="py-2 pr-4">{getRoleLabel(user.role)}</td>
              <td className="py-2 text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResourcesPanel() {
  const dispatch = useAppDispatch();
  const resources = useAppSelector((state) => state.admin.resources);
  const loading = useAppSelector((state) => state.admin.resourcesLoading);
  const error = useAppSelector((state) => state.admin.resourcesError);
  const userRole = useAppSelector((state) => state.auth.user?.role ?? -1);
  const users = useAppSelector((state) => state.admin.users);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Build a quick lookup: userId → { full_name, email }
  const userMap = new Map(users.map((u) => [u.id, { full_name: u.full_name, email: u.email }]));

  const filteredResources = resources.filter((r) => {
    if (filter === 'active') return !r.is_archived;
    if (filter === 'archived') return r.is_archived;
    if (visibilityFilter === 'public') return r.is_public;
    if (visibilityFilter === 'private') return !r.is_public;
    return true;
  });

  const emptyMessage = () => {
    if (resources.length === 0) return 'No resources found.';
    const parts: string[] = [];
    if (filter !== 'all') parts.push(filter);
    if (visibilityFilter !== 'all') parts.push(visibilityFilter);
    if (parts.length > 0) return `No ${parts.join(' ')} resources found.`;
    return 'No resources found.';
  };

  const handleDelete = async (resourceId: number) => {
    const promise = dispatch(deleteResource(resourceId)).unwrap();
    toast.promise(promise, {
      loading: 'Deleting resource...',
      success: 'Resource deleted',
      error: 'Failed to delete resource',
    });
    await promise;
    setDeleteConfirmId(null);
  };

  if (loading && resources.length === 0) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  if (resources.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-medium mb-4">Resources</h2>
        <p className="text-sm text-muted-foreground">{emptyMessage()}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-medium">Resources</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Status:</label>
          <ThemeSelect<'all' | 'active' | 'archived'>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <label className="text-sm text-muted-foreground whitespace-nowrap">Visibility:</label>
          <ThemeSelect<'all' | 'public' | 'private'>
            value={visibilityFilter}
            onChange={setVisibilityFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'public', label: 'Public' },
              { value: 'private', label: 'Private' },
            ]}
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Resource?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              This will permanently delete the resource and its file from storage. This action cannot be undone. Superadmin only.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Title</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Filename</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Owner</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Visibility</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Uploaded</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Archived</th>
            {userRole === 3 && (
              <th className="text-left py-2 font-medium text-muted-foreground">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredResources.length === 0 ? (
            <tr>
              <td colSpan={userRole === 3 ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">
                {emptyMessage()}
              </td>
            </tr>
          ) : (
            filteredResources.map((resource) => (
            <tr key={resource.id} className="border-b last:border-b-0 hover:bg-muted/50">
              <td className="py-2 pr-4 font-medium">{resource.title}</td>
              <td className="py-2 pr-4 text-muted-foreground truncate max-w-[150px]">{resource.filename || '—'}</td>
              <td className="py-2 pr-4 text-muted-foreground">
                <UserLabel
                  userId={resource.owner_id}
                  preloaded={userMap.get(resource.owner_id)}
                />
              </td>
              <td className="py-2 pr-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${resource.is_public ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {getVisibilityBadge(resource.is_public)}
                </span>
              </td>
              <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{new Date(resource.created_at).toLocaleDateString()}</td>
              <td className="py-2 pr-4">
                {resource.is_archived ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Archived</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              {userRole === 3 && (
                <td className="py-2 pr-4">
                  <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmId(resource.id)}>Delete</Button>
                </td>
              )}
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const userRole = useAppSelector((state) => state.auth.user?.role ?? -1);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole < 2) {
      router.push('/my-resources');
      return;
    }
    dispatch(fetchUsers());
    dispatch(fetchResources({ includeArchived: true }));
  }, [dispatch, router, userRole, isAuthenticated]);

  // Don't render admin content for non-admin users
  if (userRole < 2) {
    return null;
  }

  const renderPanel = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewPanel />;
      case 'users':
        return <UsersPanel />;
      case 'resources':
        return <ResourcesPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and resource management.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-[180px] flex flex-col gap-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.key}
              variant={activeSection === item.key ? 'default' : 'ghost'}
              onClick={() => setActiveSection(item.key)}
              className="justify-start"
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Panel content */}
        <div className="flex-1 min-w-0">
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
