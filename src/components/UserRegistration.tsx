/**
 * UserRegistration - Self-service user registration component
 * 
 * Allows new users to create their own accounts without admin intervention.
 * Maintains zero-knowledge architecture with complete vault isolation.
 * 
 * Made with ❤️ by Pink Pixel ✨
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { analyzePassphrase, getStrengthColor } from '@/security/PassphraseValidator';
import type { PassphraseAnalysis } from '@/security/PassphraseValidator';
import { supabase } from '@/integrations/supabase/client';

interface UserRegistrationProps {
  onSuccess: (username: string, passphrase: string) => void;
  onCancel: () => void;
}

export default function UserRegistration({ onSuccess, onCancel }: UserRegistrationProps) {
  const [username, setUsername] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passphraseAnalysis, setPassphraseAnalysis] = useState<PassphraseAnalysis | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Validate username format
  const validateUsername = (value: string): string | null => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 50) return 'Username must be less than 50 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    return null;
  };

  // Check if username already exists
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('vault_config')
        .select('user_id')
        .eq('user_id', username)
        .limit(1);

      if (error) {
        throw error;
      }

      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      console.error('Error checking username:', error);
      throw error;
    }
  };

  // Debounced username validation
  useEffect(() => {
    const formatError = validateUsername(username);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    if (!username) {
      setUsernameError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingUsername(true);
        const exists = await checkUsernameExists(username);
        
        if (exists) {
          setUsernameError('Username already exists. Please choose a different username.');
        } else {
          setUsernameError(null);
        }
      } catch {
        setUsernameError('Unable to verify username right now. Please try again.');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Update passphrase analysis
  useEffect(() => {
    if (passphrase) {
      const analysis = analyzePassphrase(passphrase);
      setPassphraseAnalysis(analysis);
    } else {
      setPassphraseAnalysis(null);
    }
  }, [passphrase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate username
    const usernameValidation = validateUsername(username);
    if (usernameValidation) {
      setError(usernameValidation);
      return;
    }

    // Check username exists
    try {
      const exists = await checkUsernameExists(username);
      if (exists) {
        setError('Username already exists. Please choose a different username.');
        return;
      }
    } catch {
      setError('Unable to verify username availability right now. Please try again.');
      return;
    }

    // Validate passphrase
    if (!passphrase || passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters long');
      return;
    }

    // Validate passphrase confirmation
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    setIsRegistering(true);

    try {
      // Call parent success handler with credentials
      await onSuccess(username.trim(), passphrase);
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error instanceof Error ? error.message : 'Registration failed');
      setIsRegistering(false);
    }
  };

  const getStrengthLabel = (strength: string): string => {
    const labels = {
      'very-weak': 'Very Weak',
      'weak': 'Weak',
      'fair': 'Fair',
      'good': 'Good',
      'strong': 'Strong',
      'very-strong': 'Very Strong'
    };
    return labels[strength as keyof typeof labels] || 'Unknown';
  };

  return (
    <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <CardHeader className="text-center">
        {/* Keyper Logo and Title */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-1 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
            <img
              src="/logo.png"
              alt="Keyper Logo"
              className="h-8 w-8 rounded-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-foreground">Keyper</h1>
        </div>

        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create New User Account</CardTitle>
        <CardDescription>
          Register a new user with their own encrypted vault
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          The strength meter is advisory only. Any passphrase with at least 8 characters can be used.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter unique username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isRegistering}
              className={usernameError ? 'border-red-500' : ''}
            />
            {isCheckingUsername && (
              <p className="text-xs text-muted-foreground">Checking availability...</p>
            )}
            {usernameError && (
              <p className="text-xs text-red-500">{usernameError}</p>
            )}
            {username && !usernameError && !isCheckingUsername && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Username available
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              3-50 characters, letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {/* Passphrase field */}
          <div className="space-y-2">
            <Label htmlFor="passphrase">Master Passphrase</Label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? "text" : "password"}
                placeholder="Create a strong passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="pr-10"
                disabled={isRegistering}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {/* Passphrase strength indicator */}
            {passphrase && passphraseAnalysis && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Strength:</span>
                  <Badge
                    variant="outline"
                    className="text-white"
                    style={{ backgroundColor: getStrengthColor(passphraseAnalysis.strength) }}
                  >
                    {getStrengthLabel(passphraseAnalysis.strength)}
                  </Badge>
                </div>
                <Progress value={passphraseAnalysis.score} className="h-2" />
                {passphraseAnalysis.warnings.length > 0 && (
                  <div className="text-xs text-red-500">
                    {passphraseAnalysis.warnings.slice(0, 2).join(", ")}
                  </div>
                )}
                {passphraseAnalysis.recommendations.length > 0 && passphraseAnalysis.warnings.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    {passphraseAnalysis.recommendations.slice(0, 1).join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm passphrase field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassphrase">Confirm Passphrase</Label>
            <div className="relative">
              <Input
                id="confirmPassphrase"
                type={showConfirmPassphrase ? "text" : "password"}
                placeholder="Re-enter your passphrase"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                className="pr-10"
                disabled={isRegistering}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassphrase(!showConfirmPassphrase)}
              >
                {showConfirmPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirmPassphrase && passphrase !== confirmPassphrase && (
              <p className="text-xs text-red-500">Passphrases do not match</p>
            )}
            {confirmPassphrase && passphrase === confirmPassphrase && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Passphrases match
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={
                isRegistering ||
                !username ||
                !passphrase ||
                !confirmPassphrase ||
                passphrase !== confirmPassphrase ||
                !!usernameError ||
                isCheckingUsername
              }
            >
              {isRegistering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isRegistering}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </form>

        {/* Security notices */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Security Notice:</strong> Your passphrase encrypts your vault and never leaves your device.
            Losing it means losing access to your encrypted data.
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50/50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <strong>Multi-User Support:</strong> Each user gets their own isolated encrypted vault.
            No user can access another user's data.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
