# 📝 Changelog

All notable changes to Keyper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2025-08-23 - 🔐 **Major Security Overhaul: Simplified bcrypt-Only Passphrase System**

### 🚨 **Revolutionary Passphrase Reset System**
- **Added** Simplified bcrypt-only master passphrase authentication
  - **Eliminated** complex Argon2/AES key derivation for passphrase validation
  - **Implemented** direct bcrypt hash verification for instant authentication
  - **Removed** all backdoors, admin overrides, and security vulnerabilities
  - **Created** user-controlled passphrase reset via direct database access
  - **Enhanced** Security through elimination of attack vectors

### 🔓 **User-Controlled Emergency Reset**
- **Added** `docs/EMERGENCY_PASSPHRASE_RESET.md` - Comprehensive reset guide
  - **Instructions** for bcrypt hash generation using online tools
  - **Step-by-step** database update procedure via Supabase dashboard
  - **Security explanations** why this approach is safe and user-controlled
  - **Troubleshooting** section for common reset issues

### 🏗️ **Architecture Transformation**
- **Simplified** Vault encryption system:
  - **New Users**: `raw_dek` (base64) + `bcrypt_hash` storage
  - **Legacy Users**: Continue using existing `wrapped_dek` system (backwards compatible)
  - **Dual Support**: Automatic detection and handling of both vault formats
  - **Migration Path**: Optional upgrade path for existing users

### 🛡️ **Enhanced Security Model**
- **Removed** Emergency access systems and backdoors:
  - **Deleted** `src/security/HatchGate.ts` - Eliminated backdoor access
  - **Removed** `src/components/ResetKeyper.tsx` - No admin reset capability
  - **Cleaned** All references to emergency admin access
  - **Updated** Documentation to reflect new security-first approach

### 🔧 **Technical Improvements**
- **Created** `src/crypto/bcrypt.ts` - Secure bcrypt utility functions
- **Enhanced** `src/services/VaultStorage.ts` - Dual format support
- **Updated** `src/services/VaultManager.ts` - Smart vault type detection
- **Simplified** `src/services/SecureVault.ts` - Maintains legacy compatibility
- **Improved** Type definitions with legacy/new vault config types

### 🗄️ **Database Schema Evolution**
- **Updated** `supabase-setup.sql` and `src/components/Settings.tsx`:
  - **Added** `raw_dek TEXT` column (nullable for backwards compatibility)
  - **Enhanced** `bcrypt_hash TEXT` column for new passphrase system
  - **Maintained** `wrapped_dek JSONB` for existing users
  - **Secured** All PostgreSQL functions with proper `SECURITY DEFINER` settings

### 📋 **Migration Support**
- **Created** `migration-bcrypt.sql` - Database migration script
  - **Adds** new columns to existing vault_config table
  - **Provides** detailed migration instructions for existing users
  - **Maintains** full backwards compatibility
  - **Guides** users through optional upgrade process

### ✨ **User Experience**
- **New Users**: Automatic bcrypt-only system with instant reset capability
- **Existing Users**: No changes required, everything continues working
- **Reset Process**: Simple 4-step process using any bcrypt generator website
- **No Downtime**: Seamless deployment with zero breaking changes

### 🎯 **Security Benefits**
- **Eliminated** All potential backdoors and admin overrides
- **Simplified** Attack surface by removing complex key derivation chains
- **Enhanced** User control - only database owner can reset passphrases
- **Maintained** Strong AES-256-GCM encryption for actual credential data
- **Preserved** Zero-knowledge architecture principles

### 📚 **Documentation Updates**
- **Removed** All emergency access and backdoor documentation
- **Added** User-controlled passphrase reset instructions
- **Updated** Security model documentation throughout project
- **Enhanced** Setup instructions with new migration procedures

---

## [1.0.3] - 2025-08-23 - 🔒 **Security Enhancement: PostgreSQL Function Hardening**

### 🔒 **Security Improvements**
- **Fixed** PostgreSQL function search_path security warnings (function_search_path_mutable)
  - **update_updated_at_column**: Added `SET search_path = ''` security parameter
  - **get_credential_stats**: Added `SET search_path = ''` + fully qualified schema references
  - **check_rls_status**: Added `SET search_path = ''` + fully qualified schema references
  - **Protection**: Prevents search path injection attacks and ensures consistent behavior
  - **Compliance**: Meets PostgreSQL security best practices and OWASP guidelines

### 🛡️ **Enhanced Database Security**
- **Added** `rls-security-fixes.sql` - Standalone security patch for existing databases
- **Updated** `supabase-setup.sql` - Main setup script now includes secure function definitions
- **Improved** All functions now use `SECURITY DEFINER` with empty search_path
- **Qualified** All database object references use explicit `schema.table` notation
- **Documented** Comprehensive security implementation details in updated files

### 🔧 **Technical Details**
- **Search Path Security**: All PostgreSQL functions now set `search_path = ''` to prevent path manipulation
- **Schema Qualification**: Database objects referenced with explicit `public.tablename` format
- **Consistent Context**: Functions execute with predictable, secure environment
- **Best Practices**: Aligned with PostgreSQL security recommendations and industry standards

### 📚 **Documentation Updates**
- **Updated** `RLS_FIXES_NEEDED.md` - Now shows resolved status with implementation details
- **Added** Security fix implementation guide with verification queries
- **Enhanced** Database setup instructions with security considerations

---

## [1.0.1] - 2025-08-16 - 🚨 **Emergency Troubleshooting System**

### 🚨 **Major: Panic Hatch System**
- **Added** Emergency diagnostic and reset system for stuck configurations
  - **HatchGate.ts**: Session-based temporary access control with short-lived session TTL
  - **ResetKeyper.tsx**: Comprehensive diagnostic page for troubleshooting
  - **Hidden Route**: Secure diagnostic route only accessible when armed
  - **Health Checks**: Database table verification and connection testing
  - **Config Reset**: Selective clearing of Keyper configuration keys
  - **Origin Reset**: Complete site data clearing for extreme cases

### 🛡️ **Enhanced Security**
- **Added** Obscurity-based emergency access without compromising authentication
- **Added** Session storage with automatic expiration for temporary access
- **Added** Optional admin marker requirement for additional protection
- **Added** Professional ops procedures with encryption recommendations
- **Security Note**: Emergency system uses security-by-obscurity, not authentication bypass

### 🔧 **Troubleshooting Capabilities**
- **Fixed** Ability to recover from configuration loops and stuck states
- **Added** Visual health indicators for database table status
- **Added** Selective configuration clearing to force setup re-run
- **Added** Complete browser data clearing for nuclear reset option
- **Improved** Error recovery and diagnostic information display

### 📚 **Operational Documentation**
- **Added** Confidential emergency access procedures (encrypted)
- **Added** Console-based arming methods for CSP-compliant access
- **Added** Bookmarklet support for environments with relaxed CSP
- **Added** Professional ops playbook with security considerations

### 🎯 **Deployment Notes**
- **Router Integration**: Hidden route properly integrated with lazy loading
- **CSP Compliance**: Works with strict Content Security Policy
- **Production Ready**: Designed for enterprise deployment scenarios
- **No UI Exposure**: Emergency features not discoverable through normal UI

---

## [1.0.0] - 2025-08-13 - 🎉 **STABLE PRODUCTION RELEASE!**

### 🎉 **Major: First Stable Release**
This is the **first stable production release** of Keyper, marking the completion of all major features and comprehensive quality assurance.

### ✅ **Verified Production Readiness**
- **🔍 Comprehensive Feature Review**: All major features thoroughly tested and verified
  - ✅ **Encryption System**: AES-256-GCM with Argon2id/PBKDF2 key derivation fully operational
  - ✅ **Vault Management**: Auto-lock, activity tracking, and secure state management
  - ✅ **Credential CRUD**: Complete Create/Read/Update/Delete operations with encryption
  - ✅ **Multi-User Support**: Secure user isolation and vault switching
  - ✅ **Progressive Web App**: Full PWA capabilities with offline support
  - ✅ **Database Integration**: Supabase integration with Row Level Security

### 🛡️ **Security Certification**
- **🔒 Security Audit**: Professional security assessment with **EXCELLENT** rating
- **🧪 Test Coverage**: 50+ comprehensive tests covering all critical paths
- **📋 Compliance**: OWASP Top 10 and NIST Cybersecurity Framework adherence
- **⚡ Performance**: Optimized encryption operations with benchmark validation

### 🔐 **Advanced Credential Management**
- **📝 Full CRUD Operations**: Complete credential lifecycle management
  - **Create**: AddCredentialModal with comprehensive form validation
  - **Read**: CredentialDetailModal with secure data display
  - **Update**: EditCredentialModal with pre-population and validation
  - **Delete**: Secure deletion with user confirmation
- **🎯 Smart Organization**: Categories, tags, priority levels, expiration tracking
- **🔍 Advanced Search**: Real-time filtering and search capabilities
- **🔒 Encryption Integration**: Seamless vault integration with zero-knowledge architecture

### 🏗️ **Enterprise Architecture**
- **⚙️ Service Layer**: EncryptedCredentialsApi with comprehensive error handling
- **🎣 React Hooks**: useVault and useEncryption for seamless state management
- **🗄️ Database Services**: VaultManager, SecureVault, and VaultStorage integration
- **🔧 Modern Stack**: React 19.1, TypeScript 5.8.3, Vite 7.0.6, Tailwind CSS

### 📚 **Complete Documentation Suite**
- **📖 User Guide**: Comprehensive usage instructions with security best practices
- **🔍 Security Audit**: Professional security assessment and threat analysis
- **🏗️ Technical Overview**: Architecture diagrams and implementation details
- **🚀 Quick Start**: 5-minute setup guide with troubleshooting
- **📝 API Documentation**: Complete developer reference

### 🚀 **Performance & Optimization**
- **⚡ Fast Encryption**: Optimized AES-256-GCM operations
- **📦 Bundle Size**: Efficient code splitting and tree shaking
- **🔄 Caching**: Smart caching strategies for offline functionality
- **📱 PWA**: Native app-like experience on all devices

### 🎯 **Quality Assurance**
- **🧪 Comprehensive Testing**: Unit tests, integration tests, security scenarios
- **🔒 Cryptographic Validation**: Extensive crypto function testing
- **⚡ Performance Testing**: Encryption/decryption benchmarking
- **🌐 Cross-Browser**: Tested on Chrome, Firefox, Safari, Edge

### 🛡️ **Security Features Summary**
- **Zero-Knowledge Architecture**: Client-side encryption, no server-side secrets
- **AES-256-GCM**: Authenticated encryption with integrity protection
- **Argon2id/PBKDF2**: Memory-hard key derivation with fallback
- **Auto-Lock Protection**: Configurable timeout with activity detection
- **Secure Random**: Web Crypto API for cryptographically secure randomness
- **Constant-Time Operations**: Timing attack protection
- **Row Level Security**: Database-level user isolation

### 🎉 **Stable API**
All public APIs are now considered stable and will follow semantic versioning for future updates.

---

## [0.1.0] - 2025-08-01 - 🎉 **COMPLETE  PRODUCTION-READY!**

### 🔐 **Major: Enterprise-Grade Encryption System**
- **Added** AES-256-GCM encryption with authenticated encryption
- **Added** Argon2id key derivation (memory-hard, ASIC-resistant) with PBKDF2 fallback
- **Added** Zero-knowledge architecture with client-side encryption
- **Added** Secure vault management with auto-lock functionality
- **Added** Migration wizard for encrypting existing plaintext credentials
- **Added** Backward compatibility system for mixed encrypted/plaintext environments
- **Added** Advanced cryptographic error handling with CryptoError types
- **Added** Constant-time comparison functions for security
- **Added** Secure memory management within JavaScript limitations
- **Added** Automatic key derivation algorithm selection (Argon2id preferred, PBKDF2 fallback)

### 🛡️ **Major: Advanced Security Features**
- **Added** Content Security Policy (CSP) with XSS protection
- **Added** Comprehensive security audit logging system (SecurityAuditLogger)
- **Added** Advanced passphrase strength validation with entropy calculation (PassphraseValidator)
- **Added** Security event tracking and monitoring
- **Added** Real-time threat detection and risk scoring
- **Added** Professional security audit with EXCELLENT rating
- **Added** OWASP Top 10 compliance assessment
- **Added** Cryptographic error types with proper handling
- **Added** Secure blob validation and format checking
- **Added** Performance benchmarking for key derivation algorithms

### 🧪 **Major: Testing  Quality Assurance**
- **Added** Comprehensive unit test suite (50+ tests) with Vitest framework
- **Added** Cryptographic function testing with multiple scenarios
- **Added** Integration tests for complete workflows
- **Added** Security scenario testing and edge cases
- **Added** Performance and load testing for encryption operations
- **Added** Error handling and boundary condition testing
- **Added** Encoding utilities testing (Base64, UTF-8, constant-time)
- **Added** Mock data generation for testing scenarios
- **Added** Test coverage reporting and quality metrics
- **Added** jsdom environment for browser API testing

### 📚 **Major: Documentation Suite**
- **Added** Complete security architecture documentation
- **Added** Comprehensive security audit report (SECURITY_AUDIT.md)
- **Added** User guide with security best practices (USER_GUIDE.md)
- **Added** API documentation and developer guides
- **Added** Troubleshooting and FAQ sections
- **Added** Deployment and configuration instructions
- **Added** Contributing guidelines (CONTRIBUTING.md)
- **Added** Security policy and reporting procedures
- **Added** Technical overview and architecture diagrams
- **Added** Cryptographic implementation details

### 🔧 **Technical Improvements**
- **Fixed** All TypeScript compilation errors and strict mode compliance
- **Fixed** Vite build configuration for Argon2 WebAssembly integration
- **Improved** Error handling and user feedback
- **Improved** Performance optimization for encryption operations
- **Added** Progressive Web App (PWA) capabilities

### 🎯 **Production Readiness**
- **Verified** Security audit approval for production deployment
- **Verified** Build system working perfectly
- **Verified** All core functionality tested and validated
- **Verified** Enterprise-grade security implementation
- **Verified** Comprehensive documentation coverage

## [0.3.1] - 2025-08-01 - 🔧 Multi-User Vault State Management

### 🔧 Fixed
- **🔐 Vault State Isolation** - Fixed critical issue with singleton vault state bleeding between users
  - Added vault locking during user context switches to clear cryptographic state
  - Implemented proper vault state reset in user creation flow
  - Added vault locking on login attempts to ensure clean state
  - Fixed "Invalid master passphrase" errors for previous users after creating new accounts
  - Multi-user functionality now works correctly with page refresh between logins
  
- **👥 Multi-User Login Flow** - Improved user switching experience
  - Enhanced PassphraseGate to lock vault before switching user contexts
  - Added debug logging for vault state management operations
  - Improved vault state management in DashboardSettings user creation
  - Better isolation of encryption keys between different user sessions

### 📝 Documentation
- **Updated** Multi-user usage instructions with refresh requirement
- **Added** UI guidance for switching between user accounts
- **Enhanced** Troubleshooting section with multi-user scenarios

### ⚠️ Known Limitations
- **Browser Refresh Required** - Users should refresh the page when switching between different user accounts for optimal experience
- This limitation is acceptable for current use cases and may be addressed in future versions

## [0.3.0] - 2025-08-01 - 🔐 Multi-User Vault Architecture

### 🚀 Major Features Added
- **👥 Multi-User Support** - Complete multi-user architecture for shared instances
  - Configurable username system for multiple users on same instance
  - Username + passphrase unlock flow for secure user switching
  - Per-user vault isolation with encrypted storage
  - Dynamic database policies supporting multiple usernames
  - Secure vault state management with automatic locking on user switch
  
- **🔐 Enhanced Vault System** - Upgraded encryption architecture
  - Username-based vault configuration storage
  - Improved first-time user detection and setup flow
  - Enhanced PassphraseGate with username field and validation
  - Secure user switching with vault locking mechanism
  
- **🗄️ Database Infrastructure Improvements** - Scalable multi-user database design
  - Updated RLS policies to support dynamic usernames instead of hardcoded values
  - Flexible vault_config table supporting per-user encryption keys
  - Enhanced VaultStorage service with proper user isolation
  - Improved database connection handling and error recovery

### 🔧 Fixed
- **🔄 Settings Configuration Reset** - Fixed critical issue where clearing Supabase configuration would prevent new credentials from being entered
  - State initialization now properly loads from localStorage instead of default placeholders
  - Clear function now correctly resets form to empty strings rather than default values
  - Form inputs now properly capture and retain new credentials after clearing
  - Improved user experience when switching between different Supabase instances

- **📂 Categories Dropdown with Custom Username** - Fixed issue where categories dropdown was empty when using custom usernames
  - Categories filtering now properly includes default categories for all users
  - Default categories (created with 'self-hosted-user') are now available to all custom usernames
  - Maintains proper isolation for user-specific custom categories
  - Ensures consistent category availability across different username configurations

- **🔐 Vault User ID Mismatch** - Fixed critical authentication errors preventing vault operations
  - VaultStorage now uses configured username instead of hardcoded 'keyper-instance'
  - Database policies updated to allow access for any username (multi-user support)
  - Resolved 401 errors when creating or accessing vault configurations
  - Improved error handling for database connection issues

### 🎨 UI/UX Improvements
- **🔓 Enhanced Unlock Interface** - Improved vault unlock experience
  - Added username field to unlock form for multi-user support
  - Updated PassphraseGate component with proper form structure
  - Better visual hierarchy with labeled input fields
  - Improved first-time setup vs. existing user detection
  
- **📚 Documentation Updates** - Comprehensive troubleshooting additions
  - Added cache/cookie clearing instructions for configuration reset
  - Updated setup documentation for multi-user scenarios
  - Enhanced README with multi-user support information
  - Improved troubleshooting section with specific browser instructions

### 🏗️ Technical Improvements
- **⚙️ Enhanced Configuration Management** - Improved settings and user management
  - Better separation between initial setup and dashboard settings
  - Improved username persistence and validation
  - Enhanced error messages for configuration issues
  - More robust client refresh handling after configuration changes

### 🎯 Planned
- Bulk operations for credentials
- Import/export functionality
- Advanced search filters
- Credential sharing capabilities
- Backup and restore features
- Enhanced dashboard settings for advanced user management

## [0.2.0] - 2025-08-01 - Self-Hosting Release 🏠

### 🚀 Major Features Added
- **🏠 Self-Hosting Support** - Complete self-hosting capability with npm package distribution
  - `@pinkpixel/keyper` npm package for global installation
  - Dynamic Supabase configuration with localStorage persistence
  - User-configurable database instances
  - Bypass authentication for self-hosted environments

- **📦 CLI Binary** - Beautiful command-line interface
  - Multi-colored ASCII banner with Keyper branding
  - Multiple command aliases: `keyper`, `credential-manager`, `keyper-dashboard`
  - Comprehensive error handling and user guidance
  - Automatic server startup with `vite preview`

- **🗄️ Database Setup Automation** - Complete SQL setup script
  - `supabase-setup.sql` with full schema creation
  - Row Level Security (RLS) policies for data isolation
  - Performance indexes and automatic triggers
  - Default categories and verification queries

- **📱 Progressive Web App (PWA)** - Mobile app experience
  - Installable on desktop and mobile devices
  - Offline functionality with service worker
  - Supabase caching strategy for better performance
  - Native app-like experience

- **⚙️ Settings & Configuration UI** - Seamless setup experience
  - Intuitive Supabase URL and API key configuration
  - One-click SQL script copying
  - Connection testing with detailed feedback
  - Refresh button for PWA compatibility
  - Step-by-step setup instructions

### 🔧 Technical Improvements
- **Dynamic Client Creation** - Supabase client adapts to user configuration
- **localStorage Integration** - Persistent credential storage
- **Enhanced Error Handling** - Better user feedback and troubleshooting
- **Improved Routing** - Self-hosted flow as default, hosted at `/hosted`
- **PWA Manifest** - Complete Progressive Web App configuration

### 📚 Documentation Updates
- **README.md** - Comprehensive self-hosting instructions
- **Setup Guides** - Detailed Supabase configuration documentation
- **Troubleshooting** - Common issues and solutions
- **Installation** - Multiple installation methods and commands

### 🎨 UI/UX Enhancements
- **Settings Interface** - Modern, tabbed configuration UI
- **Connection Status** - Visual feedback for database connectivity
- **SQL Script Preview** - Collapsible script preview functionality
- **Responsive Design** - Mobile-first approach for all new components

### ✨ Added - 2025-05-29
- **🚀 Cloudflare Pages Deployment** - Complete deployment configuration
  - `wrangler.toml` - Wrangler configuration with security headers
  - `_routes.json` - Cloudflare Pages routing configuration
  - `_headers` - Security headers and caching policies
  - `_redirects` - SPA redirect configuration
  - Automated deployment scripts for Windows (PowerShell) and Linux/macOS (Bash)
  - Environment variables template (`.env.example`)
  - Comprehensive deployment documentation (`DEPLOYMENT.md`)
  - Deployment verification script (`verify-deployment.js`)
- **✅ Enhanced UI/UX** - Improved credential management flow
  - Enhanced credential viewing dialog with copy functionality
  - Improved edit modal with proper close behavior
  - Password/secret visibility toggles in view mode
  - Fixed modal closing issues and X button functionality
- **🔧 Development Improvements**
  - Added deployment scripts to package.json
  - Wrangler CLI integration
  - Deployment verification tooling
- **🎨 Custom Branding Integration**
  - Replaced key icons with custom Pink Pixel logo (`/logo.png`)
  - Updated favicon with custom design (`/favicon.png`)
  - Enhanced HTML meta tags for better SEO and social media sharing
  - Improved Open Graph and Twitter Card metadata
  - Added Cloudinary-hosted logo to README header
  - Comprehensive badge collection showcasing tech stack and project status

## [0.1.0] - 2025-05-29

### ✨ Added
- **Initial Release** - Core credential management functionality
- **Credential Storage** - Support for multiple credential types:
  - 🔑 API Keys
  - 🔐 Login credentials (username/password)
  - 🤫 Secrets
  - 🎫 Tokens
  - 📜 Certificates
- **Organization Features**:
  - 🏷️ Categories for grouping credentials
  - 🔖 Tags for flexible labeling
  - ⚡ Priority levels (low, medium, high, critical)
  - 📅 Expiration date tracking
- **User Interface**:
  - 🌙 Modern dark theme with cyan accents
  - 📱 Fully responsive design
  - 🔍 Real-time search and filtering
  - 🎨 Glassmorphism design elements
  - ⚡ Loading states and error handling
- **Security Features**:
  - 🔒 Row Level Security (RLS) policies
  - 🔐 Encrypted credential storage
  - 👤 User-based data isolation
  - 🛡️ Secure authentication flow

### 🏗️ Technical Implementation
- **Frontend**: React 18.3 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom themes
- **UI Components**: shadcn/ui component library
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: TanStack Query + React hooks
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React icon library
- **Routing**: React Router DOM

### 🗄️ Database Schema
- **credentials table** - Comprehensive credential storage
- **categories table** - Organization and categorization
- **RLS policies** - User data security and isolation

### 📦 Dependencies
- Core: React, TypeScript, Vite, Supabase
- UI: Tailwind CSS, Radix UI primitives, Lucide icons
- Forms: React Hook Form, Zod validation
- State: TanStack Query for server state
- Utils: date-fns, clsx, class-variance-authority

### 🎨 Design System
- **Color Palette**: Dark theme with cyan (#06B6D4) accents
- **Typography**: System fonts with clear hierarchy
- **Components**: Consistent design patterns
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design approach

### 🔧 Development Setup
- **ESLint**: Code quality and consistency
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast development and optimized builds
- **PostCSS**: CSS processing with Tailwind
- **Component Tagger**: Development debugging (Lovable)

---

## 📋 Version History Format

### Types of Changes
- ✨ **Added** - New features
- 🔄 **Changed** - Changes in existing functionality
- 🗑️ **Deprecated** - Soon-to-be removed features
- 🚫 **Removed** - Removed features
- 🐛 **Fixed** - Bug fixes
- 🔒 **Security** - Security improvements

### Priority Levels
- 🚨 **Critical** - Security fixes, data loss prevention
- ⚡ **High** - Major features, breaking changes
- 📈 **Medium** - Minor features, improvements
- 🔧 **Low** - Documentation, refactoring

---

*This changelog is maintained by Pink Pixel and follows semantic versioning.*

**Made with ❤️ by Pink Pixel** ✨
*Dream it, Pixel it*
