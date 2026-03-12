import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  UserPlus,
  Trash2,
  Settings,
  RefreshCw,
  AlertTriangle,
  Info,
  Database,
  Key,
  Users,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUsername, clearSupabaseCredentials, supabase, saveSupabaseCredentials, getSupabaseCredentials, saveCurrentUsername, getDatabaseProvider } from '@/integrations/supabase/client';
import { secureVault } from '@/services/SecureVault';
import setupSqlScript from '/supabase-setup.sql?raw';
import updateSqlScript from '/update-db.sql?raw';

interface DashboardSettingsProps {
  onUserCreated?: () => void;
}

export const DashboardSettings: React.FC<DashboardSettingsProps> = ({ onUserCreated }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSetupSqlScript, setShowSetupSqlScript] = useState(false);
  const [showUpdateSqlScript, setShowUpdateSqlScript] = useState(false);
  const { toast } = useToast();
  const currentUser = getCurrentUsername();
  const dbProvider = getDatabaseProvider();
  // Note: Admin functions removed for security - no backdoors or admin overrides
  const adminUser = null; // Removed: getAdminUser() - no admin backdoors
  const isSuperAdmin = false; // Removed: isCurrentUserAdmin() - no admin privileges

  const handleCreateUser = async () => {
    if (!newUsername || !newPassphrase) {
      toast({
        title: "Error",
        description: "Username and passphrase are required",
        variant: "destructive",
      });
      return;
    }

    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only superadmin users can create new users",
        variant: "destructive",
      });
      return;
    }

    if (newPassphrase.length < 8) {
      toast({
        title: "Error",
        description: "Passphrase must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);

      // Check if user already exists in vault_config
      const { data: existingUsers, error: checkError } = await supabase
        .from('vault_config')
        .select('user_id')
        .eq('user_id', newUsername.trim());

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing users: ${checkError.message}`);
      }

      if (existingUsers && existingUsers.length > 0) {
        toast({
          title: "Error",
          description: `User '${newUsername}' already exists`,
          variant: "destructive",
        });
        return;
      }

      // Create a new vault for the user
      // IMPORTANT: We need to temporarily switch context to create vault for new user
      console.log('🔧 Creating vault for new user:', newUsername.trim());
      console.log('🔧 Admin context before:', getCurrentUsername());

      // Lock the current vault to clear any existing state
      secureVault.lock();
      console.log('🔧 Locked vault to clear state');

      // Create bcrypt hash for the new user's passphrase
      const { hashPassphrase } = await import('@/crypto/bcrypt');
      const bcryptHash = await hashPassphrase(newPassphrase);

      // Temporarily save the new user as current user for vault creation
      const adminCredentials = getSupabaseCredentials();
      saveCurrentUsername(newUsername.trim());

      console.log('🔧 Switched context to:', getCurrentUsername());
      const wrappedDEK = await secureVault.createNewVault(newPassphrase);

      // Lock the vault again to clear the new user's state
      secureVault.lock();
      console.log('🔧 Locked vault after user creation');

      // Switch back to admin user
      saveCurrentUsername(currentUser);
      console.log('🔧 Switched back to admin:', getCurrentUsername());

      // Save the wrapped DEK and bcrypt hash to the database for the new user
      const { error: insertError } = await supabase
        .from('vault_config')
        .insert({
          user_id: newUsername.trim(),
          wrapped_dek: wrappedDEK,
          bcrypt_hash: bcryptHash,
        });

      if (insertError) {
        throw new Error(`Failed to create user vault: ${insertError.message}`);
      }

      // Create default categories for the new user
      const defaultCategories = [
        { user_id: newUsername.trim(), name: 'Development', color: '#3b82f6', icon: 'code', description: 'Development tools and APIs' },
        { user_id: newUsername.trim(), name: 'Personal', color: '#10b981', icon: 'user', description: 'Personal accounts and services' },
        { user_id: newUsername.trim(), name: 'Work', color: '#f59e0b', icon: 'briefcase', description: 'Work-related credentials' },
        { user_id: newUsername.trim(), name: 'Social Media', color: '#ec4899', icon: 'users', description: 'Social media accounts' },
        { user_id: newUsername.trim(), name: 'Finance', color: '#06b6d4', icon: 'credit-card', description: 'Banking and financial services' },
        { user_id: newUsername.trim(), name: 'Cloud Services', color: '#8b5cf6', icon: 'cloud', description: 'Cloud platforms and services' },
        { user_id: newUsername.trim(), name: 'Security', color: '#ef4444', icon: 'shield', description: 'Security tools and certificates' }
      ];

      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(defaultCategories);

      if (categoriesError) {
        console.warn('Failed to create default categories for new user:', categoriesError);
        // Don't fail the user creation for this
      }

      toast({
        title: "Success! 🎉",
        description: `User '${newUsername}' created successfully. They can now login with their credentials.`,
      });

      setNewUsername('');
      setNewPassphrase('');
      onUserCreated?.();

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetLocalData = () => {
    if (confirm('This will clear all local configuration and require database setup again. Continue?')) {
      clearSupabaseCredentials();
      localStorage.clear();
      toast({
        title: "Local Data Cleared",
        description: "All local configuration has been reset. Please refresh the page.",
      });
      setTimeout(() => window.location.reload(), 2000);
    }
  };

  const handleClearBrowserCache = () => {
    const instructions = `To completely reset Keyper:

1. Open browser settings
2. Go to Privacy/Security section
3. Clear browsing data/storage
4. Select "Cookies and site data" and "Cached files"
5. Choose "All time" as time range
6. Click Clear data
7. Refresh this page`;

    navigator.clipboard.writeText(instructions);
    toast({
      title: "Instructions Copied",
      description: "Browser cache clearing instructions copied to clipboard",
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard.`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Settings</h1>
          <p className="text-gray-400">User management and system controls</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="database-sql" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database SQL
          </TabsTrigger>
          <TabsTrigger value="reset" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset Options
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {isSuperAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-green-400" />
                  Create New User
                </CardTitle>
                <CardDescription>
                  Add new users to this Keyper instance. Each user will have their own encrypted vault.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-username">Username *</Label>
                    <Input
                      id="new-username"
                      type="text"
                      placeholder="e.g., alice, bob, team1"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-passphrase">Initial Passphrase *</Label>
                    <Input
                      id="new-passphrase"
                      type="password"
                      placeholder="Strong passphrase for the user"
                      value={newPassphrase}
                      onChange={(e) => setNewPassphrase(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    The new user will be able to login with these credentials and change their passphrase later.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleCreateUser}
                  disabled={isCreating || !newUsername || !newPassphrase}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isCreating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {isCreating ? 'Creating...' : 'Create User'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Shield className="h-5 w-5" />
                  Enhanced Security Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    For maximum security, admin privileges and user creation have been disabled.
                    This removes all backdoors and security vulnerabilities. <br/>
                    Current user: <strong>{currentUser}</strong> |
                    Security Level: <strong>Maximum (No Admin Backdoors)</strong>
                  </AlertDescription>
                </Alert>
                <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-200 font-medium mb-2">Security Enhancement:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Admin backdoors completely removed for enhanced security</li>
                    <li>• Users can only reset their own passphrases via database</li>
                    <li>• No privileged access or admin overrides available</li>
                    <li>• Each user controls their own encrypted vault independently</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="database-sql" className="space-y-6">
          <Alert className="border-amber-500 bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              New credential types (`document`, `misc`) require running the update SQL on existing databases.
              These features will not work until the update script is applied.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                Full Database Setup Script
              </CardTitle>
              <CardDescription>
                Use this when setting up a brand-new Supabase database for Keyper. (Supabase only — SQLite schema is created automatically.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Dashboard
                </Button>
                <Button
                  onClick={() => copyToClipboard(setupSqlScript, 'Full setup SQL script')}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy Setup Script
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowSetupSqlScript((prev) => !prev)}
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  {showSetupSqlScript ? 'Hide Script' : 'View Script'}
                </Button>
              </div>

              {showSetupSqlScript && (
                <div className="bg-gray-900 p-4 rounded-lg max-h-56 overflow-y-auto border border-gray-700">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">{setupSqlScript}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-green-400" />
                Existing Database Update Script
              </CardTitle>
              <CardDescription>
                Use this if you already have Keyper data and want to upgrade safely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => copyToClipboard(updateSqlScript, 'Database update SQL script')}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy Update Script
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowUpdateSqlScript((prev) => !prev)}
                  className="text-green-300 hover:text-green-200"
                >
                  {showUpdateSqlScript ? 'Hide Script' : 'View Script'}
                </Button>
              </div>

              {showUpdateSqlScript && (
                <div className="bg-gray-900 p-4 rounded-lg max-h-56 overflow-y-auto border border-gray-700">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">{updateSqlScript}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reset" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-400" />
                Reset Local Configuration
              </CardTitle>
              <CardDescription>
                Clear local settings and force database reconfiguration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  This will clear your database connection settings and require you to set them up again.
                </p>
                <Button
                  onClick={handleResetLocalData}
                  variant="outline"
                  className="flex items-center gap-2 border-orange-500 text-orange-400 hover:bg-orange-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Reset Local Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-400" />
                Reset Master Passphrase
              </CardTitle>
              <CardDescription>
                Securely reset your master passphrase through your database (Your data remains encrypted)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Good News:</strong> Your encrypted data is safe! You can reset your passphrase by updating the <code>bcrypt_hash</code> value directly in your database.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-200">
                    To reset your master passphrase:
                  </p>
                  {dbProvider === 'sqlite' ? (
                    <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside pl-4">
                      <li>Visit <a href="https://bcrypt-generator.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">https://bcrypt-generator.com/</a></li>
                      <li>Under "Text to Hash", enter your <strong>new desired passphrase</strong></li>
                      <li>Click "Generate" and copy the resulting bcrypt hash</li>
                      <li>Open your SQLite database file with a tool such as <a href="https://sqlitebrowser.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">DB Browser for SQLite</a></li>
                      <li>Navigate to the <code>vault_config</code> table, find your user row</li>
                      <li>Paste the new hash into the <code>bcrypt_hash</code> column and save</li>
                    </ol>
                  ) : (
                    <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside pl-4">
                      <li>Login to your <strong>Supabase Dashboard</strong></li>
                      <li>Navigate to the <code>vault_config</code> table in the Table Editor</li>
                      <li>Visit <a href="https://bcrypt-generator.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">https://bcrypt-generator.com/</a></li>
                      <li>Under "Text to Hash", enter your <strong>new desired passphrase</strong></li>
                      <li>Click "Generate" to create the hash</li>
                      <li>Copy the generated hash</li>
                      <li>Paste it into the <code>bcrypt_hash</code> column for your user row</li>
                      <li>Save the changes</li>
                    </ol>
                  )}
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Security Note:</strong> It's impossible to convert a hash back to a string - your data remains secure!
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted/50 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-200 font-medium mb-2">Important:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• It's not possible to <strong>view/see</strong> your current master passphrase</li>
                    <li>• You can only <strong>update/change</strong> your passphrase using this method</li>
                    <li>• Your encrypted credentials remain completely safe during this process</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-400" />
                Complete Browser Reset
              </CardTitle>
              <CardDescription>
                Instructions to completely reset Keyper in your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  For a complete reset, follow these browser-specific steps:
                </p>
                <Button
                  onClick={handleClearBrowserCache}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Copy Reset Instructions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                System Information
              </CardTitle>
              <CardDescription>
                Current system status and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Current User</Label>
                    <p className="text-sm text-muted-foreground font-mono">{currentUser}</p>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Security Level</Label>
                    <p className="text-sm text-green-400 font-medium">
                      Maximum (No Admin Backdoors)
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Master Passphrase</Label>
                    <p className="text-sm text-blue-400 font-mono">Bcrypt-Only Secure Reset</p>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">App Version</Label>
                    <p className="text-sm text-muted-foreground">0.1.0</p>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Mode</Label>
                    <p className="text-sm text-muted-foreground">Self-Hosted</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium">Security Architecture</Label>
                <p className="text-sm text-gray-400">
                  Enhanced security model: Admin privileges removed, bcrypt-only master passphrase with user-controlled reset.
                  All users operate within their isolated encrypted vaults with zero-knowledge architecture.
                </p>
                <div className="mt-2 p-3 bg-green-500/10 rounded border border-green-500/20">
                  <p className="text-xs text-green-300">
                    🔐 For emergency passphrase reset instructions: <span className="font-mono text-blue-300">/docs/EMERGENCY_PASSPHRASE_RESET.md</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
