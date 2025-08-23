# 🔐 Keyper Security Architecture & Best Practices

**Keyper Self-Hosted** implements enterprise-grade end-to-end encryption to protect your credentials. This document outlines the security architecture, best practices, and implementation details.

*Made with ❤️ by Pink Pixel ✨*

---

## 🛡️ Security Overview

### Zero-Knowledge Architecture
- **Client-Side Encryption**: All sensitive data is encrypted in your browser before transmission
- **No Server-Side Secrets**: Your passphrase and decrypted data never leave your device
- **Database Encryption**: Only encrypted blobs are stored in your Supabase database

### Cryptographic Standards
- **Encryption**: AES-256-GCM with unique IVs per record
- **Key Derivation**: Argon2id (preferred) or PBKDF2-HMAC-SHA256 (fallback)
- **Master Passphrase**: Simplified bcrypt-only authentication for new users
- **Legacy Support**: Backwards compatibility with wrapped DEK system
- **Random Generation**: Cryptographically secure random number generation
- **Constant-Time Operations**: Protection against timing attacks

---

## 🔑 Encryption Implementation

### Key Derivation Functions

#### Argon2id (Preferred)
```
Parameters:
- Time: 3 iterations
- Memory: 64MB
- Parallelism: 1 thread
- Output: 256-bit key
```

**Benefits:**
- Memory-hard function resistant to ASIC attacks
- Winner of the Password Hashing Competition
- Optimal balance of security and performance

#### PBKDF2-HMAC-SHA256 (Fallback)
```
Parameters:
- Iterations: 310,000
- Hash: SHA-256
- Salt: 128-bit random
- Output: 256-bit key
```

**When Used:**
- Argon2 unavailable or fails to load
- Older browser compatibility
- Resource-constrained environments

### Encryption Process

1. **Salt Generation**: 128-bit cryptographically secure random salt
2. **Key Derivation**: Passphrase + salt → 256-bit AES key
3. **IV Generation**: 96-bit random initialization vector
4. **Encryption**: AES-256-GCM with authenticated encryption
5. **Storage**: Base64-encoded encrypted blob with metadata

### Data Format (Version 1)
```json
{
  "v": 1,
  "kdf": "argon2id",
  "salt": "base64-encoded-salt",
  "iv": "base64-encoded-iv", 
  "ct": "base64-encoded-ciphertext"
}
```

---

## 🔒 Passphrase Security

### Strength Requirements
- **Minimum Length**: 12 characters (8 minimum enforced)
- **Character Variety**: Uppercase, lowercase, numbers, symbols
- **Pattern Detection**: Prevents keyboard patterns and sequences
- **Dictionary Checks**: Blocks common words and phrases

### Strength Analysis
The system performs comprehensive passphrase analysis:

- **Entropy Calculation**: Measures randomness and unpredictability
- **Pattern Detection**: Identifies weak patterns (123, abc, qwerty)
- **Crack Time Estimation**: Estimates time to break with modern hardware
- **Real-Time Feedback**: Provides actionable improvement suggestions

### Best Practices
✅ **DO:**
- Use a unique, strong passphrase for Keyper
- Consider using a passphrase manager
- Use 15+ characters for optimal security
- Mix character types (upper, lower, numbers, symbols)
- Use memorable but unpredictable phrases

❌ **DON'T:**
- Reuse passphrases from other services
- Use personal information (names, dates, etc.)
- Use common words or phrases
- Use keyboard patterns (qwerty, 123456)
- Share your passphrase with anyone

---

## 🛡️ Security Features

### Auto-Lock Protection
- **Default Timeout**: 15 minutes of inactivity
- **Configurable**: Adjust timeout or disable auto-lock
- **Activity Detection**: Extends timeout on user interaction
- **Memory Clearing**: Attempts to clear passphrase from memory

### Content Security Policy (CSP)

#### Production (Recommended)
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
```

#### Additional Production Headers (Hardened)
```
referrer-policy: no-referrer
permissions-policy: camera=(), microphone=(), geolocation=()
x-content-type-options: nosniff
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
```

#### Development (Looser for DX)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
```

**Protection Against:**
- Cross-Site Scripting (XSS)
- Code injection attacks
- Clickjacking
- MIME type confusion

### Security Audit Logging
- **Event Tracking**: All security operations logged
- **Risk Scoring**: Automatic threat level assessment
- **Failed Attempts**: Suspicious activity detection
- **Performance Metrics**: Operation timing and success rates

---

## 🔧 Implementation Security

### Row Level Security (RLS)
Enhanced PostgreSQL policies with WITH CHECK constraints:

```sql
-- Prevent data leakage with strict policies
CREATE POLICY "credentials_select_policy" ON credentials
  FOR SELECT USING (user_id = 'self-hosted-user');

CREATE POLICY "credentials_insert_policy" ON credentials
  FOR INSERT WITH CHECK (user_id = 'self-hosted-user');
```

### Database Security
- **Encrypted Storage**: Only encrypted blobs stored
- **User Isolation**: Strict row-level security
- **No Plaintext**: Sensitive data never stored unencrypted
- **Audit Trail**: Complete operation logging

### Client-Side Security
- **Memory Protection**: Passphrase cleared on lock
- **Secure Random**: Cryptographically secure RNG
- **Constant Time**: Timing attack protection
- **Error Handling**: No information leakage in errors

---

## 🚨 Threat Model

### Protected Against
✅ **Database Compromise**: Encrypted data remains secure  
✅ **Network Interception**: End-to-end encryption  
✅ **XSS Attacks**: Content Security Policy protection  
✅ **Timing Attacks**: Constant-time operations  
✅ **Brute Force**: Strong key derivation functions  
✅ **Rainbow Tables**: Unique salts per record  

### Limitations
⚠️ **Client Compromise**: Malware on your device could access unlocked data  
⚠️ **Passphrase Loss**: No recovery mechanism (by design)  
⚠️ **Browser Vulnerabilities**: Depends on browser security  
⚠️ **Side-Channel Attacks**: Limited protection in JavaScript environment  

---

## 📋 Security Checklist

### Deployment Security
- [ ] Use HTTPS for all connections
- [ ] Configure proper CSP headers
- [ ] Enable security headers (HSTS, X-Frame-Options)
- [ ] Regular security updates
- [ ] Monitor security logs

### Operational Security
- [ ] Use strong, unique passphrase
- [ ] Enable auto-lock with appropriate timeout
- [ ] Regular security audits
- [ ] Monitor failed login attempts
- [ ] Keep browser updated

### Data Security
- [ ] Regular encrypted backups
- [ ] Test restore procedures
- [ ] Monitor encryption statistics
- [ ] Audit credential access
- [ ] Clean up old credentials

---

## 🔍 Security Monitoring

### Metrics to Monitor
- **Encryption Rate**: Percentage of encrypted credentials
- **Failed Attempts**: Unusual authentication failures
- **Performance**: Encryption/decryption timing
- **Errors**: Cryptographic operation failures

### Security Events
The system logs comprehensive security events:
- Vault unlock/lock operations
- Encryption/decryption activities
- Failed authentication attempts
- Security policy violations
- Performance anomalies

### Alerting
Consider monitoring for:
- Multiple failed unlock attempts
- Unusual access patterns
- Performance degradation
- Security policy violations

---

## 🆘 Incident Response

### Suspected Compromise
1. **Immediate**: Lock vault and change passphrase
2. **Assess**: Review security logs for anomalies
3. **Rotate**: Update all stored credentials
4. **Monitor**: Watch for continued suspicious activity

### Data Recovery
1. **Backup**: Ensure encrypted backups are available
2. **Verify**: Test backup integrity and decryption
3. **Restore**: Import encrypted data to new instance
4. **Validate**: Confirm all data accessible with passphrase

### Passphrase Recovery

**Dual System Architecture:**

**🆕 New Users (Bcrypt-Only System):**
- ✅ Secure emergency passphrase reset available
- 📖 See comprehensive [Emergency Passphrase Reset Guide](./EMERGENCY_PASSPHRASE_RESET.md)
- 🔒 User-controlled reset process with no admin backdoors
- 🛡️ All encrypted data remains completely safe during reset

**🔄 Legacy Users (Wrapped DEK System):**
- ⚠️ No recovery mechanism (by original design)
- 🚨 If you lose your passphrase, all encrypted data becomes permanently inaccessible
- 🔄 You must start fresh with a new passphrase
- 🛡️ This is intentional for maximum security

**Migration Recommendation:** Consider migrating to the new bcrypt-only system for improved passphrase reset capabilities.

---

## 📚 Additional Resources

### Security Standards
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Argon2 Specification](https://tools.ietf.org/html/rfc9106)

### Best Practices
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)

---

## 🤝 Security Contact

Found a security issue? Please report it responsibly:

- **Email**: admin@pinkpixel.dev
- **Subject**: [SECURITY] Keyper Security Issue
- **Include**: Detailed description and reproduction steps

We take security seriously and will respond promptly to legitimate security reports.

---

*This document is part of Keyper Self-Hosted v0.1.0*  
*Last updated: August 2025*
