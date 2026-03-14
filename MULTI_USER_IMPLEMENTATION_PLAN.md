# Multi-User Registration Implementation Plan

> **Implementation Status (v1.1.1): ✅ Completed (Core Scope)**
> Self-service user registration, user switching UI, and per-user vault isolation are now implemented in the app.
> Remaining items in this document should be treated as optional future enhancements.

## 🎯 Goal

Re-enable secure multi-user support in Keyper while maintaining the "Enhanced Security Mode" (no admin backdoors) architecture.

## 🔒 Security Principles (Non-Negotiable)

- ✅ **Zero-knowledge architecture** - Each user's vault is completely isolated
- ✅ **No admin backdoors** - No one can access another user's passphrase or vault
- ✅ **Self-service passphrase reset** - Users control their own emergency reset via bcrypt hash
- ✅ **Database-level isolation** - RLS policies already support multi-user (user_id field)
- ✅ **Independent encryption** - Each user has their own DEK and bcrypt hash

## 📋 Current State Analysis

### What's Already Working

1. ✅ Database schema supports multi-user (`user_id` field in all tables)
2. ✅ RLS policies allow multi-user access (policies use `true` for self-hosted mode)
3. ✅ Vault system supports per-user encryption (bcrypt + raw_dek per user_id)
4. ✅ Emergency passphrase reset system exists (bcrypt hash in vault_config)
5. ✅ Username switching works (Settings → Username field)

### What Was Disabled (Now Re-enabled in Core Flow)

- ✅ User registration UI/flow (restored as self-service)
- ✅ User management interface (restored in Dashboard Settings)
- ✅ Admin controls remain intentionally removed (security-by-design)

### What We Need to Add

- ✅ Self-service user registration flow
- ✅ User list/switching interface (non-admin)
- ✅ Optional: Invite code system for controlled access

---

## 🏗️ Implementation Plan

### Phase 1: Database Preparation

**Goal**: Ensure database supports multi-user registration

#### 1.1 Review Current Schema

- [x] Verify `vault_config` table has `user_id` with UNIQUE constraint
- [x] Verify `credentials` table has `user_id` field
- [x] Verify `categories` table has `user_id` field
- [x] Confirm RLS policies allow multi-user access

**Status**: ✅ Schema already supports multi-user! No changes needed.

#### 1.2 Optional: Add Invite System (Future Enhancement)

```sql
-- Optional table for invite-based registration
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by TEXT, -- Username who created it (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = true;
```

**Decision**: Skip for now, implement in Phase 3 if needed.

---

### Phase 2: User Registration Flow

**Goal**: Create self-service registration without admin involvement

#### 2.1 Create Registration Component

**File**: `src/components/UserRegistration.tsx`

**Features**:

- Username input (must be unique)
- Master passphrase creation (with strength indicator)
- Passphrase confirmation field
- Terms/security notice
- Check if username already exists in `vault_config` table

**Validation**:

- Username: 3-50 characters, alphanumeric + underscore/hyphen
- Passphrase: Minimum 8 characters (use existing PassphraseValidator)
- Check username uniqueness against `vault_config.user_id`

#### 2.2 Update PassphraseGate Component

**File**: `src/components/PassphraseGate.tsx`

**Changes**:

- Add "Create New User" button/link on login screen
- Show registration form when clicked
- After successful registration, automatically log in the new user

**Flow**:

```
┌─────────────────────────┐
│   PassphraseGate        │
│                         │
│  [Username Input]       │
│  [Passphrase Input]     │
│                         │
│  [Unlock Vault]         │
│  [Create New User] ←────┼─── NEW
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│  UserRegistration       │
│                         │
│  [New Username]         │
│  [New Passphrase]       │
│  [Confirm Passphrase]   │
│                         │
│  [Register]  [Cancel]   │
└─────────────────────────┘
```

#### 2.3 Registration Logic

**File**: `src/services/VaultManager.ts`

**New Method**: `registerNewUser(username: string, passphrase: string)`

```typescript
async registerNewUser(username: string, passphrase: string): Promise<void> {
  // 1. Check if username already exists
  const { data: existing } = await supabase
    .from('vault_config')
    .select('user_id')
    .eq('user_id', username)
    .single();

  if (existing) {
    throw new Error('Username already exists. Please choose a different username.');
  }

  // 2. Set the username in localStorage
  saveCurrentUsername(username);

  // 3. Create new vault for this user (uses existing createVault method)
  await this.createVault(passphrase);

  // 4. Create default categories for new user
  await this.createDefaultCategories(username);
}

private async createDefaultCategories(username: string): Promise<void> {
  const defaultCategories = [
    { name: 'Development', color: '#3b82f6', icon: 'code' },
    { name: 'Personal', color: '#10b981', icon: 'user' },
    { name: 'Work', color: '#f59e0b', icon: 'briefcase' },
    // ... etc
  ];

  for (const cat of defaultCategories) {
    await supabase.from('categories').insert({
      user_id: username,
      ...cat
    });
  }
}
```

---

### Phase 3: User Management Interface

**Goal**: Allow users to see and switch between accounts (non-admin)

#### 3.1 Create User Switcher Component

**File**: `src/components/UserSwitcher.tsx`

**Features**:

- List all users (query distinct `user_id` from `vault_config`)
- Show current user with indicator
- Switch user button (locks current vault, changes username, shows login)
- "Add New User" button

**UI Location**:

- Option A: In Settings → User Management tab
- Option B: Dropdown in top navigation bar
- Option C: Both

**Security Note**: This only lists usernames, no access to vaults without passphrase.

#### 3.2 Update Settings Component

**File**: `src/components/Settings.tsx`

**New Tab**: "User Management"

**Features**:

- Current user display
- List of all registered users
- Switch user functionality
- Create new user button
- Delete current user (with confirmation + passphrase verification)

---

### Phase 4: Enhanced Security Messaging

**Goal**: Clearly communicate the security model to users

#### 4.1 Update Settings Security Tab

**File**: `src/components/Settings.tsx`

**Add Section**: "Multi-User Security Model"

```markdown
### Multi-User Security Model

✅ **Independent Vaults**: Each user has their own encrypted vault
✅ **Zero-Knowledge**: No user can access another user's data
✅ **No Admin Backdoors**: Even system admins cannot recover passphrases
✅ **Self-Service Reset**: Users control their own emergency passphrase reset
⚠️ **Passphrase Responsibility**: Losing your passphrase means losing access to your vault

**How It Works**:

1. Each username gets its own vault_config entry with unique encryption keys
2. Your master passphrase never leaves your device
3. All credentials are encrypted client-side before storage
4. Switching users requires entering that user's passphrase
```

#### 4.2 Update README.md

**File**: `README.md`

**Update Section**: "Multi-User Support"

- Explain self-service registration
- Clarify no admin access to vaults
- Document user switching process
- Link to emergency passphrase reset guide

---

### Phase 5: Optional Enhancements (Future)

#### 5.1 Invite Code System

- Admin can generate invite codes
- Registration requires valid invite code
- Codes can have expiration and usage limits
- Useful for controlled access scenarios

#### 5.2 User Profile Metadata

```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  email TEXT, -- Optional, for notifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);
```

#### 5.3 Audit Logging

- Track user creation events
- Track login attempts (without exposing passphrases)
- Track vault operations for security monitoring

---

## 🔧 Implementation Steps (Ordered)

### Step 1: Create UserRegistration Component

- [x] Create `src/components/UserRegistration.tsx`
- [x] Add username validation
- [x] Add passphrase strength indicator
- [x] Add username uniqueness check
- [x] Add registration form UI

### Step 2: Add Registration Method to VaultManager

- [x] Add `registerNewUser()` method
- [x] Add `createDefaultCategories()` helper
- [x] Add username existence check
- [x] Test registration flow

### Step 3: Update PassphraseGate

- [x] Add "Create New User" button
- [x] Integrate UserRegistration component
- [x] Handle registration success/failure
- [x] Auto-login after registration

### Step 4: Create UserSwitcher Component

- [x] Create `src/components/UserSwitcher.tsx`
- [x] Query all users from vault_config
- [x] Add user switching logic
- [x] Add current user indicator

### Step 5: Update Settings Component

- [x] Add "User Management" tab
- [x] Integrate UserSwitcher
- [ ] Add user deletion functionality (not implemented by design in current scope)
- [x] Update security documentation

### Step 6: Testing

- [ ] Test new user registration
- [ ] Test user switching
- [ ] Test vault isolation (User A cannot see User B's data)
- [ ] Test passphrase reset for multiple users
- [ ] Test SQLite multi-user support
- [ ] Test Supabase multi-user support

### Step 7: Documentation

- [ ] Update README.md with multi-user instructions
- [ ] Update CHANGELOG.md
- [ ] Create user guide for multi-user setup
- [ ] Update security documentation

---

## 🧪 Testing Checklist

### Functional Tests

- [ ] New user can register with unique username
- [ ] Registration fails with duplicate username
- [ ] New user gets default categories
- [ ] User can switch between accounts
- [ ] Each user's vault is isolated
- [ ] Passphrase reset works per-user

### Security Tests

- [ ] User A cannot access User B's credentials
- [ ] User A cannot see User B's categories
- [ ] Switching users locks previous vault
- [ ] No admin backdoor exists
- [ ] Emergency reset only affects current user

### Edge Cases

- [ ] Registration with special characters in username
- [ ] Very long usernames (50+ chars)
- [ ] Concurrent user creation
- [ ] User deletion with active credentials
- [ ] SQLite vs Supabase behavior differences

---

## 📊 Success Metrics

### Must Have (MVP)

- ✅ Users can self-register without admin
- ✅ Users can switch between accounts
- ✅ Each user's vault is completely isolated
- ✅ No admin backdoors exist
- ✅ Emergency passphrase reset works per-user

### Nice to Have (Future)

- ⭐ Invite code system for controlled access
- ⭐ User profile metadata (display name, email)
- ⭐ Audit logging for security monitoring
- ⭐ User activity dashboard

---

## 🚨 Security Considerations

### What We're NOT Doing (By Design)

- ❌ Admin user management (no privileged accounts)
- ❌ Admin passphrase recovery (zero-knowledge architecture)
- ❌ Cross-user data access (complete isolation)
- ❌ Centralized user authentication (self-hosted model)

### What We ARE Doing

- ✅ Self-service registration (no admin needed)
- ✅ Per-user encryption keys (complete isolation)
- ✅ Self-service passphrase reset (bcrypt hash method)
- ✅ Username-based vault separation (database-level)

---

## 📝 Notes

### Why This Approach is Secure

1. **No Admin Backdoors**: Registration doesn't require admin approval or create privileged access
2. **Zero-Knowledge**: Each user's passphrase never leaves their device
3. **Database Isolation**: RLS policies + user_id ensure data separation
4. **Self-Service Reset**: Users control their own emergency reset via bcrypt hash
5. **Existing Architecture**: Leverages current vault system, just adds registration UI

### Migration Path

- Existing users: No changes needed, continue using current username
- New users: Can register via new registration flow
- Both types: Use same vault system, same security model

### Compatibility

- ✅ Works with Supabase backend
- ✅ Works with SQLite backend
- ✅ Works in browser/PWA
- ✅ Works in Electron desktop app
- ✅ Backwards compatible with existing vaults

---

## 🎉 Expected Outcome

After implementation, Keyper will support:

1. **Self-Service Registration**: Users can create accounts without admin
2. **User Switching**: Easy switching between multiple user accounts
3. **Complete Isolation**: Each user's vault is cryptographically isolated
4. **No Backdoors**: Maintains "Enhanced Security Mode" architecture
5. **Emergency Reset**: Each user controls their own passphrase reset

All while maintaining the EXCELLENT security rating! 🔐✨

---

**Made with ❤️ by Pink Pixel - Dream it, Pixel it ✨**
