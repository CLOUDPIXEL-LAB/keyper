
import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEncryption } from '@/hooks/useVault';
import {
  X,
  Plus,
  Save,
  Loader2,
  Upload,
  FileText,
  Trash2,
} from 'lucide-react';
import { Credential, Category } from '../SelfHostedDashboard';

interface EditCredentialModalProps {
  credential: Credential | null;
  onClose: () => void;
  categories: Category[];
  onCredentialUpdated: () => void;
}

const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.odt,.txt,.md';
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const EditCredentialModal = ({
  credential,
  onClose,
  categories,
  onCredentialUpdated,
}: EditCredentialModalProps) => {
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const certificateFileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    credential_type: 'api_key' | 'login' | 'secret' | 'token' | 'certificate' | 'document' | 'misc';
    priority: 'low' | 'medium' | 'high' | 'critical';
    username: string;
    password: string;
    api_key: string;
    secret_value: string;
    token_value: string;
    certificate_data: string;
    misc_value: string;
    document_name: string;
    document_mime_type: string;
    document_content_base64: string;
    document_size_bytes: number;
    url: string;
    category: string;
    notes: string;
    expires_at: string;
  }>({
    title: '',
    description: '',
    credential_type: 'api_key',
    priority: 'medium',
    username: '',
    password: '',
    api_key: '',
    secret_value: '',
    token_value: '',
    certificate_data: '',
    misc_value: '',
    document_name: '',
    document_mime_type: '',
    document_content_base64: '',
    document_size_bytes: 0,
    url: '',
    category: '',
    notes: '',
    expires_at: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { encryptCredential, decryptCredential, isUnlocked } = useEncryption();

  useEffect(() => {
    if (credential) {
      const populateForm = async () => {
        let decryptedSecrets: Record<string, string> = {};
        if (credential.secret_blob && isUnlocked) {
          try {
            const result = await decryptCredential(credential.secret_blob);
            decryptedSecrets = {
              password: result.password || '',
              api_key: result.api_key || '',
              secret_value: result.secret_value || '',
              token_value: result.token_value || '',
              certificate_data: result.certificate_data || '',
              misc_value: result.misc_value || '',
              document_name: result.document_name || '',
              document_mime_type: result.document_mime_type || '',
              document_content_base64: result.document_content_base64 || '',
              document_size_bytes: String(result.document_size_bytes || ''),
            };
          } catch (e) {
            console.error('Failed to decrypt credential secrets for editing', e);
          }
        }
        setFormData({
          title: credential.title,
          description: credential.description || '',
          credential_type: credential.credential_type,
          priority: credential.priority,
          username: credential.username || '',
          password: decryptedSecrets.password ?? '',
          api_key: decryptedSecrets.api_key ?? '',
          secret_value: decryptedSecrets.secret_value ?? '',
          token_value: decryptedSecrets.token_value ?? '',
          certificate_data: decryptedSecrets.certificate_data ?? '',
          misc_value: decryptedSecrets.misc_value ?? '',
          document_name: decryptedSecrets.document_name ?? '',
          document_mime_type: decryptedSecrets.document_mime_type ?? '',
          document_content_base64: decryptedSecrets.document_content_base64 ?? '',
          document_size_bytes: Number(decryptedSecrets.document_size_bytes ?? 0),
          url: credential.url || '',
          category: credential.category || '',
          notes: credential.notes || '',
          expires_at: credential.expires_at ? credential.expires_at.split('T')[0] : '',
        });
        setTags(credential.tags || []);
      };
      populateForm();
    }
  }, [credential, isUnlocked]);

  if (!credential) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.credential_type === 'certificate' && !formData.certificate_data.trim()) {
      toast({
        title: 'Error',
        description: 'Certificate content is required for certificate credentials',
        variant: 'destructive',
      });
      return;
    }
    if (formData.credential_type === 'document' && !formData.document_content_base64) {
      toast({
        title: 'Error',
        description: 'Please upload a document before saving this credential',
        variant: 'destructive',
      });
      return;
    }
    if (formData.credential_type === 'misc' && !formData.misc_value.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a value for this miscellaneous credential',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const secretsByType = (() => {
        switch (formData.credential_type) {
          case 'login':
            return { password: formData.password.trim() || undefined };
          case 'api_key':
            return { api_key: formData.api_key.trim() || undefined };
          case 'secret':
            return { secret_value: formData.secret_value.trim() || undefined };
          case 'token':
            return { token_value: formData.token_value.trim() || undefined };
          case 'certificate':
            return { certificate_data: formData.certificate_data.trim() || undefined };
          case 'document':
            return {
              document_name: formData.document_name || undefined,
              document_mime_type: formData.document_mime_type || undefined,
              document_content_base64: formData.document_content_base64 || undefined,
              document_size_bytes: formData.document_size_bytes || undefined,
            };
          case 'misc':
            return { misc_value: formData.misc_value.trim() || undefined };
          default:
            return {};
        }
      })();

      const hasSensitiveData = Object.values(secretsByType).some((value) => value !== undefined && value !== null && value !== '');

      let newSecretBlob = credential.secret_blob ?? null;
      let newEncryptedAt = credential.encrypted_at ?? null;

      if (hasSensitiveData) {
        const encrypted = await encryptCredential(secretsByType);
        newSecretBlob = encrypted.secret_blob;
        newEncryptedAt = encrypted.encrypted_at;
      }

      // Only include valid DB columns — never spread formData directly
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        credential_type: formData.credential_type,
        priority: formData.priority,
        username: formData.username.trim() || null,
        url: formData.url.trim() || null,
        category: formData.category || null,
        notes: formData.notes.trim() || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        tags,
        updated_at: new Date().toISOString(),
        secret_blob: newSecretBlob,
        encrypted_at: newEncryptedAt,
      };

      const { error } = await supabase
        .from('credentials')
        .update(updateData)
        .eq('id', credential.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credential updated successfully",
      });

      onCredentialUpdated();
      onClose();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update credential",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleCertificateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setFormData((prev) => ({ ...prev, certificate_data: content }));
      toast({
        title: 'Certificate loaded',
        description: `${file.name} is ready to save.`,
      });
    } catch (error) {
      console.error('Error reading certificate file:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not read certificate file. Please paste content instead.',
        variant: 'destructive',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleDocumentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOCUMENT_BYTES) {
      toast({
        title: 'File too large',
        description: `Document exceeds ${formatBytes(MAX_DOCUMENT_BYTES)} limit.`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const base64 = bytesToBase64(new Uint8Array(buffer));
      setFormData((prev) => ({
        ...prev,
        document_name: file.name,
        document_mime_type: file.type || 'application/octet-stream',
        document_content_base64: base64,
        document_size_bytes: file.size,
      }));
      toast({
        title: 'Document loaded',
        description: `${file.name} is ready to save.`,
      });
    } catch (error) {
      console.error('Error reading document file:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not read document file.',
        variant: 'destructive',
      });
    } finally {
      e.target.value = '';
    }
  };

  const clearDocument = () => {
    setFormData((prev) => ({
      ...prev,
      document_name: '',
      document_mime_type: '',
      document_content_base64: '',
      document_size_bytes: 0,
    }));
  };

  return (
    <Dialog open={!!credential} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Edit Credential
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Update your credential information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Type *</label>
              <select
                value={formData.credential_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    credential_type: e.target.value as Credential['credential_type'],
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                required
              >
                <option value="api_key">API Key</option>
                <option value="login">Login</option>
                <option value="secret">Secret</option>
                <option value="token">Token</option>
                <option value="certificate">Certificate</option>
                <option value="document">Document</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          </div>

          {/* Credential Fields */}
          <div className="space-y-4">
            {(formData.credential_type === 'login' || formData.credential_type === 'api_key') && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Username</label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}

            {formData.credential_type === 'login' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}

            {formData.credential_type === 'api_key' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">API Key</label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}

            {formData.credential_type === 'secret' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Secret Value</label>
                <Input
                  type="password"
                  value={formData.secret_value}
                  onChange={(e) => setFormData({ ...formData, secret_value: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}

            {formData.credential_type === 'token' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Token Value</label>
                <Input
                  type="password"
                  value={formData.token_value}
                  onChange={(e) => setFormData({ ...formData, token_value: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}

            {formData.credential_type === 'certificate' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-300">Certificate Data</label>
                  <input
                    ref={certificateFileInputRef}
                    type="file"
                    accept=".pem,.crt,.cer,.txt"
                    className="hidden"
                    onChange={handleCertificateFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => certificateFileInputRef.current?.click()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
                <Textarea
                  value={formData.certificate_data}
                  onChange={(e) => setFormData({ ...formData, certificate_data: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white font-mono text-xs"
                  rows={5}
                  placeholder="Paste certificate content here"
                />
              </div>
            )}

            {formData.credential_type === 'document' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-300">Document</label>
                  <input
                    ref={documentFileInputRef}
                    type="file"
                    accept={DOCUMENT_ACCEPT}
                    className="hidden"
                    onChange={handleDocumentFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => documentFileInputRef.current?.click()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                {formData.document_name ? (
                  <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800/70 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 truncate flex items-center gap-2">
                        <FileText className="h-4 w-4 text-cyan-400" />
                        {formData.document_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatBytes(formData.document_size_bytes)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearDocument}
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Supported: PDF, DOC, DOCX, ODT, TXT, MD (up to {formatBytes(MAX_DOCUMENT_BYTES)}).
                  </p>
                )}
              </div>
            )}

            {formData.credential_type === 'misc' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Sensitive Value</label>
                <Textarea
                  value={formData.misc_value}
                  onChange={(e) => setFormData({ ...formData, misc_value: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white font-mono text-xs"
                  rows={8}
                  placeholder="Paste any sensitive multiline text, scripts, or commands here"
                />
              </div>
            )}
          </div>

          {/* URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">URL</label>
            <Input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as Credential['priority'],
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-cyan-900/50 text-cyan-300 border-cyan-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button
                type="button"
                onClick={addTag}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Expiration Date</label>
            <Input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Credential
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
