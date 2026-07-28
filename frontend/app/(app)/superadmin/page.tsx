'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { createUser, fetchUsers } from '@/lib/features/admin/adminSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ThemeSelect } from '@/components/admin/theme-select';
import { RoleChangeControl } from '@/components/admin/role-change-dialog';
import { UserActions } from '@/components/admin/user-actions';
import { UserStatusBadge } from '@/components/admin/user-status-badge';
import {
  ROLE_ADMIN,
  ROLE_MODERATOR,
  ROLE_OPTIONS,
  ROLE_STUDENT,
  ROLE_SUPERADMIN,
  getRoleLabel,
} from '@/lib/roles';
import { toast } from 'sonner';
import type { AdminUser } from '@/types';

type Section = 'overview' | 'admins' | 'users' | 'create';

const NAV_ITEMS: Array<{ key: Section; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'admins', label: 'Staff' },
  { key: 'users', label: 'All Users' },
  { key: 'create', label: 'Create User' },
];

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function OverviewPanel() {
  const users = useAppSelector((state) => state.admin.users);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard label="Total Users" value={users.length} />
      <StatCard label="Super Admins" value={users.filter((u) => u.role === ROLE_SUPERADMIN).length} />
      <StatCard label="Admins" value={users.filter((u) => u.role === ROLE_ADMIN).length} />
      <StatCard label="Moderators" value={users.filter((u) => u.role === ROLE_MODERATOR).length} />
      <StatCard label="Students" value={users.filter((u) => u.role === ROLE_STUDENT).length} />
      <StatCard label="Suspended" value={users.filter((u) => !u.is_active).length} />
    </div>
  );
}

function UserTable({
  title,
  description,
  users,
}: {
  title: string;
  description: string;
  users: AdminUser[];
}) {
  const actorRole = useAppSelector((state) => state.auth.user?.role ?? -1);
  const selfId = useAppSelector((state) => state.auth.user?.id);
  const loading = useAppSelector((state) => state.admin.usersLoading);
  const error = useAppSelector((state) => state.admin.usersError);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || user.email}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge user={user} />
                  </TableCell>
                  <TableCell>
                    <RoleChangeControl user={user} actorRole={actorRole} selfId={selfId} />
                  </TableCell>
                  <TableCell>
                    <UserActions user={user} actorRole={actorRole} selfId={selfId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CreateUserPanel() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(String(ROLE_STUDENT));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await dispatch(
        createUser({
          email: email.trim(),
          full_name: fullName.trim(),
          password,
          role: Number(role),
        }),
      ).unwrap();
      toast.success(`Created ${user.email} as ${getRoleLabel(user.role)}`);
      setEmail('');
      setFullName('');
      setPassword('');
      setRole(String(ROLE_STUDENT));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create User</CardTitle>
        <CardDescription>
          Creates an account directly at any role. The email must be a .edu address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input
              id="new-user-name"
              required
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-user-password">Initial password</Label>
            <Input
              id="new-user-password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters. They can change it from their profile page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label>Role</Label>
            <ThemeSelect
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create user'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SuperadminPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const users = useAppSelector((state) => state.admin.users);
  const userRole = useAppSelector((state) => state.auth.user?.role ?? -1);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole < ROLE_SUPERADMIN) {
      router.push('/my-resources');
      return;
    }
    dispatch(fetchUsers());
  }, [dispatch, router, userRole, isAuthenticated]);

  if (userRole < ROLE_SUPERADMIN) {
    return null;
  }

  const renderPanel = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewPanel />;
      case 'admins':
        return (
          <UserTable
            title="Staff"
            description="Moderators, admins and superadmins. Account actions are for admins — moderators are looked after by their admin. Superadmins cannot be modified by their peers."
            users={users.filter((u) => u.role >= ROLE_MODERATOR)}
          />
        );
      case 'users':
        return (
          <UserTable
            title="All Users"
            description="Every account, with permission and account management."
            users={users}
          />
        );
      case 'create':
        return <CreateUserPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Superadmin Dashboard</h1>
        <p className="text-muted-foreground">Permission management and account administration.</p>
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
        <div className="flex-1 min-w-0">{renderPanel()}</div>
      </div>
    </div>
  );
}
