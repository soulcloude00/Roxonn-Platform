# Private Repository Support Documentation

## Overview

The Roxonn platform supports private GitHub repositories, allowing organizations to use the platform for internal projects while maintaining privacy and security.

## Current Implementation

### Approach: GitHub App Installation Token

The system uses **GitHub App installation tokens** to verify collaborator access without requiring users to grant broad private repository permissions.

**Key Benefits:**
- No privacy violation - users don't grant access to all their private repos
- Automatic access based on actual GitHub permissions
- No manual upgrade process for contributors
- Secure and scalable

## How It Works

### For Pool Managers

1. **Registration**: Pool managers register private repos same as public
2. **GitHub App**: Must have GitHub App installed on the repository
3. **Funding**: Can fund private repos with XDC/ROXN/USDC
4. **Visibility**: Only collaborators can see the private repo

### For Contributors

1. **Automatic Access**: Contributors see private repos they have GitHub access to
2. **No Upgrade Needed**: Works with standard `public_repo` OAuth scope
3. **Real-time Validation**: Access checked on each request via GitHub API
4. **Privacy Protected**: No broad private repo access required

## Technical Implementation

### Database Schema

```sql
-- Repository privacy flag
ALTER TABLE registered_repositories
ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

-- Installation tracking
installation_id TEXT NOT NULL;  -- GitHub App installation ID
```

### Access Validation Flow

```typescript
// In /api/repositories/accessible endpoint

1. Get all registered repos from database
2. For each private repo:
   a. Get GitHub App installation token
   b. Check if user is collaborator:
      GET /repos/{owner}/{repo}/collaborators/{username}
   c. If 204 response → user has access
   d. If 404 response → user doesn't have access
3. Return accessible repos with pool info
```

### API Endpoints

#### Get Accessible Repositories
```typescript
GET /api/repositories/accessible
// Returns: public repos + private repos user has access to
// Uses: GitHub App tokens for validation
// No user private tokens needed
```

#### Register Private Repository
```typescript
POST /api/repositories/register
{
  githubRepoId: "123456",
  githubRepoFullName: "org/private-repo",
  installationId: "96046848"
}
// Sets is_private flag based on GitHub API
```

## Security Architecture

### Privacy Protection
- **No Token Storage**: Contributors' private tokens NOT stored
- **GitHub App Scope**: Only repos with app installed
- **Per-Request Validation**: Access verified each time
- **Fail-Safe**: Errors default to hiding private repos

### Access Control
```mermaid
User Request → Roxonn API → GitHub App Token →
GitHub API (check collaborator) → Show/Hide Repo
```

## Configuration

### Environment Variables
```bash
# GitHub App Configuration
GITHUB_APP_ID=           # App ID
GITHUB_APP_PRIVATE_KEY=  # Private key (PEM format)
GITHUB_APP_WEBHOOK_SECRET= # Webhook secret

# No additional config needed for private repos
```

### GitHub App Permissions Required
- Repository: Read (metadata, collaborators)
- Issues: Read/Write (for bounties)
- Pull Requests: Read (for contributions)

## Migration Path

### Old Approach (Deprecated)
```typescript
// REMOVED - Privacy violation approach
// Required users to grant 'repo' scope
// Stored github_private_access_token
// Manual upgrade flow via OAuth
```

### Current Approach
```typescript
// GitHub App installation tokens
// No user upgrade needed
// Automatic collaborator detection
// Privacy-preserving
```

## Testing

### Test Scenarios

1. **Pool Manager Flow**
   - Register private repository
   - Verify is_private flag set
   - Fund repository
   - Check visibility

2. **Contributor Flow**
   - Log in as contributor
   - View /repos page
   - Private repos visible if collaborator
   - Hidden if not collaborator

3. **Access Validation**
   ```bash
   # Add user as collaborator on GitHub
   # Refresh /repos page
   # Repo should appear

   # Remove collaborator access
   # Refresh /repos page
   # Repo should disappear
   ```

## Troubleshooting

### Repo Not Showing

1. **Check Collaborator Status**
   ```bash
   # Via GitHub API
   curl -H "Authorization: token ${GITHUB_TOKEN}" \
     https://api.github.com/repos/owner/repo/collaborators/username
   ```

2. **Verify Installation**
   ```sql
   SELECT installation_id, is_private
   FROM registered_repositories
   WHERE github_repo_full_name = 'owner/repo';
   ```

3. **Check Logs**
   ```bash
   pm2 logs github-identity-api | grep "collaborator"
   ```

### Common Issues

- **Installation Missing**: GitHub App not installed on repo
- **Permission Denied**: App lacks collaborator read permission
- **User Mismatch**: Roxonn username ≠ GitHub username
- **Cache Issues**: Frontend caching old response

## Implementation Status

✅ **Complete**:
- GitHub App collaborator checks
- Automatic access detection
- Privacy-preserving approach
- Real-time validation
- Pool manager registration

❌ **Removed** (Privacy Violations):
- OAuth upgrade flow
- Private token storage
- Manual upgrade UI

## Best Practices

1. **Always Use App Tokens**: Never store user private tokens
2. **Fail Securely**: Hide repos on any error
3. **Log Access**: Track who accesses private repos
4. **Rate Limit**: Respect GitHub API limits
5. **Cache Wisely**: Balance performance vs freshness

## Future Enhancements

- [ ] Organization-level access management
- [ ] Team-based permissions
- [ ] Access audit logs
- [ ] Caching optimization
- [ ] Batch collaborator checks

## Related Documentation

- [GitHub App Setup](/docs/GITHUB_APP.md)
- [Security](/docs/SECURITY.md)
- [API Reference](/docs/API_REFERENCE.md)

---

Last Updated: November 2024
Version: 2.0 (GitHub App approach)