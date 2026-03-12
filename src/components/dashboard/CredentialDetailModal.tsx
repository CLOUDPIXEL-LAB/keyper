import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Eye,
  EyeOff,
  Copy,
  Edit,
  Trash2,
  Key,
  User,
  Shield,
  Code,
  Award,
  FileText,
  Braces,
  Download,
  ExternalLink,
  Calendar,
  Clock
} from 'lucide-react';
import { Credential, Category } from '../SelfHostedDashboard';
import { EditCredentialModal } from './EditCredentialModal';
import { useEncryption } from '@/hooks/useVault';

interface CredentialDetailModalProps {
  credential: Credential | null;
  onClose: () => void;
  categories: Category[];
  onCredentialUpdated: () => void;
}

export const CredentialDetailModal = ({
  credential,
  onClose,
  categories,
  onCredentialUpdated,
}: CredentialDetailModalProps) => {
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [decryptedSecrets, setDecryptedSecrets] = useState<{
    password?: string;
    api_key?: string;
    secret_value?: string;
    token_value?: string;
    certificate_data?: string;
    misc_value?: string;
    document_name?: string;
    document_mime_type?: string;
    document_content_base64?: string;
    document_size_bytes?: number;
  }>({});
  const [isDecryptingSecrets, setIsDecryptingSecrets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { decryptCredential, isUnlocked } = useEncryption();
  const decryptCredentialRef = useRef(decryptCredential);
  const { toast } = useToast();

  useEffect(() => {
    decryptCredentialRef.current = decryptCredential;
  }, [decryptCredential]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api_key':
        return <Key className="h-5 w-5" />;
      case 'login':
        return <User className="h-5 w-5" />;
      case 'secret':
        return <Shield className="h-5 w-5" />;
      case 'token':
        return <Code className="h-5 w-5" />;
      case 'certificate':
        return <Award className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'misc':
        return <Braces className="h-5 w-5" />;
      default:
        return <Key className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-white';
      case 'low':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const toggleVisibility = (field: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this credential? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('credentials')
        .delete()
        .eq('id', credential.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credential deleted successfully",
      });

      onCredentialUpdated();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete credential";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLastAccessed = async () => {
    try {
      await supabase
        .from('credentials')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', credential.id);
    } catch (error) {
      console.error('Error updating last accessed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadDocument = () => {
    const base64 = decryptedSecrets.document_content_base64 ?? credential.document_content_base64;
    const fileName = decryptedSecrets.document_name ?? credential.document_name ?? 'document.bin';
    const mimeType = decryptedSecrets.document_mime_type ?? credential.document_mime_type ?? 'application/octet-stream';
    if (!base64) return;

    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      updateLastAccessed();
    } catch (error) {
      console.error('Failed to download document:', error);
      toast({
        title: 'Error',
        description: 'Failed to download stored document',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSecrets = async () => {
      if (!credential?.secret_blob || !isUnlocked) {
        setDecryptedSecrets({});
        setIsDecryptingSecrets(false);
        return;
      }

      setIsDecryptingSecrets(true);
      try {
        const result = await decryptCredentialRef.current(credential.secret_blob);
        if (isMounted) {
          setDecryptedSecrets(result);
        }
      } catch (error) {
        console.error('Failed to decrypt credential secrets for viewing', error);
      } finally {
        if (isMounted) {
          setIsDecryptingSecrets(false);
        }
      }
    };

    loadSecrets();

    return () => {
      isMounted = false;
    };
  }, [credential?.id, credential?.secret_blob, isUnlocked]);

  if (!credential) return null;

  const SensitiveField = ({
    label,
    value,
    field
  }: {
    label: string;
    value: string | null;
    field: string;
  }) => {
    if (!value) return null;

    return (
      <div className="space-y-2 min-w-0">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1 p-3 bg-gray-800 border border-gray-700 rounded-md font-mono text-sm break-all whitespace-pre-wrap leading-relaxed">
            {showSensitive[field] ? value : '•'.repeat(Math.min(value.length, 20))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleVisibility(field)}
            className="shrink-0 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            {showSensitive[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              copyToClipboard(value, label);
              updateLastAccessed();
            }}
            className="shrink-0 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={!!credential} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                  {getTypeIcon(credential.credential_type)}
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-white">
                    {credential.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-400 capitalize">
                    {credential.credential_type.replace('_', ' ')}
                  </DialogDescription>
                </div>
              </div>
              <Badge className={getPriorityColor(credential.priority)}>
                {credential.priority}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 min-w-0">
            {credential.description && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <p className="text-gray-200 p-3 bg-gray-800/50 rounded-md border border-gray-700">
                  {credential.description}
                </p>
              </div>
            )}

            {/* Credential Fields */}
            <div className="space-y-4">
              <SensitiveField
                label="Username"
                value={credential.username}
                field="username"
              />
              <SensitiveField
                label="Password"
                value={decryptedSecrets.password ?? credential.password ?? null}
                field="password"
              />
              <SensitiveField
                label="API Key"
                value={decryptedSecrets.api_key ?? credential.api_key ?? null}
                field="api_key"
              />
              <SensitiveField
                label="Secret Value"
                value={decryptedSecrets.secret_value ?? credential.secret_value ?? null}
                field="secret_value"
              />
              <SensitiveField
                label="Token"
                value={decryptedSecrets.token_value ?? credential.token_value ?? null}
                field="token_value"
              />
              <SensitiveField
                label="Certificate"
                value={decryptedSecrets.certificate_data ?? credential.certificate_data ?? null}
                field="certificate_data"
              />
              <SensitiveField
                label="Misc Sensitive Value"
                value={decryptedSecrets.misc_value ?? credential.misc_value ?? null}
                field="misc_value"
              />

              {(decryptedSecrets.document_content_base64 ?? credential.document_content_base64) && (
                <div className="space-y-2 min-w-0">
                  <label className="text-sm font-medium text-gray-300">Document</label>
                  <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800/70 px-3 py-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 truncate">
                        {decryptedSecrets.document_name ?? credential.document_name ?? 'Stored document'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {decryptedSecrets.document_mime_type ?? credential.document_mime_type ?? 'application/octet-stream'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadDocument}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {credential.secret_blob && !isUnlocked && (
                <p className="text-xs text-amber-400 bg-amber-950/20 border border-amber-800/40 rounded-md px-3 py-2">
                  Unlock vault to reveal encrypted secrets in this view.
                </p>
              )}

              {isDecryptingSecrets && (
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="animate-spin inline-block">
                    <Clock className="h-3 w-3" />
                  </span>
                  Decrypting secure fields...
                </p>
              )}
            </div>

            {credential.url && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">URL</label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-md text-sm">
                    {credential.url}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(credential.url!, '_blank')}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credential.url!, 'URL')}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {credential.category && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Category</label>
                  <p className="text-gray-200 p-2 bg-gray-800/50 rounded border border-gray-700">
                    {credential.category}
                  </p>
                </div>
              )}

              {credential.expires_at && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Expires At
                  </label>
                  <p className="text-gray-200 p-2 bg-gray-800/50 rounded border border-gray-700">
                    {formatDate(credential.expires_at)}
                  </p>
                </div>
              )}
            </div>

            {credential.tags.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {credential.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-cyan-900/50 text-cyan-300 border-cyan-700"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {credential.notes && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Notes</label>
                <p className="text-gray-200 p-3 bg-gray-800/50 rounded-md border border-gray-700 whitespace-pre-wrap">
                  {credential.notes}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <label className="text-gray-400">Created</label>
                <p className="text-gray-300">{formatDate(credential.created_at)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-gray-400">Updated</label>
                <p className="text-gray-300">{formatDate(credential.updated_at)}</p>
              </div>
              {credential.last_accessed && (
                <div className="space-y-1">
                  <label className="text-gray-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Last Accessed
                  </label>
                  <p className="text-gray-300">{formatDate(credential.last_accessed)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-700">
              <Button
                onClick={handleDelete}
                disabled={loading}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {loading ? 'Deleting...' : 'Delete'}
              </Button>

              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Close
                </Button>
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditCredentialModal
        credential={isEditModalOpen ? credential : null}
        onClose={() => setIsEditModalOpen(false)}
        categories={categories}
        onCredentialUpdated={() => {
          onCredentialUpdated();
          setIsEditModalOpen(false);
        }}
      />
    </>
  );
};
