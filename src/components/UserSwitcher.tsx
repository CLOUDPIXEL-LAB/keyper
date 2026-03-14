import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUsername, supabase } from '@/integrations/supabase/client';
import { vaultManager } from '@/services/VaultManager';
import { AlertTriangle, Lock, RefreshCw, Shield, UserPlus, Users } from 'lucide-react';

const SHOW_REGISTRATION_KEY = 'keyper-show-registration';

interface RegisteredUser {
  user_id: string;
  created_at?: string;
}

interface UserSwitcherProps {
  onUserSwitched?: () => void;
}

export default function UserSwitcher({ onUserSwitched }: UserSwitcherProps) {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingUser, setSwitchingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentUser = getCurrentUsername();

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('vault_config')
        .select('user_id, created_at')
        .order('user_id', { ascending: true });

      if (queryError) {
        throw queryError;
      }

      setUsers((data || []) as RegisteredUser[]);
    } catch (loadError) {
      console.error('Failed to load registered users:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load registered users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleSwitchUser = async (username: string) => {
    if (username === currentUser) {
      return;
    }

    setSwitchingUser(username);
    setError(null);

    try {
      vaultManager.switchUserContext(username);
      onUserSwitched?.();
      window.location.reload();
    } catch (switchError) {
      console.error('Failed to switch user:', switchError);
      setError(switchError instanceof Error ? switchError.message : 'Failed to switch user');
      setSwitchingUser(null);
    }
  };

  const handleAddUser = () => {
    localStorage.setItem(SHOW_REGISTRATION_KEY, 'true');
    vaultManager.lockVault();
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          User Management
        </CardTitle>
        <CardDescription>
          Each username has its own vault. Switching only changes the active login context and still requires that user&apos;s passphrase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Current user: <strong>{currentUser}</strong>. There are no admin backdoors, and switching users never bypasses passphrase verification.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Users
          </Button>
          <Button
            type="button"
            onClick={handleAddUser}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add New User
          </Button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Loading registered users...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No registered users were found yet.
            </div>
          ) : (
            users.map((user) => {
              const isCurrent = user.user_id === currentUser;

              return (
                <div
                  key={user.user_id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.user_id}</span>
                      {isCurrent && <Badge variant="secondary">Current</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.created_at
                        ? `Registered ${new Date(user.created_at).toLocaleDateString()}`
                        : 'Registration date unavailable'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant={isCurrent ? 'secondary' : 'outline'}
                    onClick={() => void handleSwitchUser(user.user_id)}
                    disabled={Boolean(switchingUser) || isCurrent}
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    {switchingUser === user.user_id ? 'Switching...' : isCurrent ? 'Active User' : 'Switch User'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
