# Contributing to ATlast

Thank you for your interest in contributing! This guide will help you get started with local development.

## Two Development Modes

We support two development modes:

🎨 **Mock Mode** (No backend required)  
**Best for:** Frontend development, UI/UX work, design changes

🔧 **Full Mode** (Complete backend)  
**Best for:** Backend development, API work, OAuth testing, database changes

**Requirements:**
- PostgreSQL database (local or Neon)
- OAuth keys
- Environment configuration

---

## Mock Mode Starting Guide

Perfect for frontend contributors who want to jump in quickly!

1. Clone and Install
```bash
git clone <repo-url>
cd atlast
npm install
```

2. Create .env.local
```bash
# .env.mock
VITE_LOCAL_MOCK=true
VITE_ENABLE_OAUTH=false
VITE_ENABLE_DATABASE=false
```

3. Start Development
```bash
npm run dev:mock
```

4. Open Your Browser  
Go to `http://localhost:5173`

5. "Login" with Mock User
Enter any handle - it will create a mock session.

6. Upload Test Data  
Upload your TikTok or Instagram data file. The mock API will generate fake matches for testing the UI.

---

## Full Mode Starting Guide

For contributors working on backend features, OAuth, or database operations.

### Prerequisites

- Node.js 18+
- PostgreSQL (or Neon account)
- OpenSSL (for key generation)

1. Clone and Install
```bash
git clone <repo-url>
cd atlast
npm install
npm install -g netlify-cli
```

2. Database Setup  
   
    **Option A: Neon (Recommended)**
    1. Create account at https://neon.tech
    2. Create project "atlast-dev"
    3. Copy connection string

    **Option B: Local PostgreSQL**
    ```bash
    # macOS
    brew install postgresql@15
    brew services start postgresql@15
    createdb atlast_dev

    # Ubuntu
    sudo apt install postgresql
    sudo systemctl start postgresql
    sudo -u postgres createdb atlast_dev
    ```

3. Generate OAuth Keys
```bash
# Generate private key
openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem

# Extract public key
openssl ec -in private-key.pem -pubout -out public-key.pem

# View private key (copy for .env)
cat private-key.pem
```

4. Extract Public Key JWK
```bash
node -e "
const fs = require('fs');
const jose = require('jose');
const pem = fs.readFileSync('public-key.pem', 'utf8');
jose.importSPKI(pem, 'ES256').then(key => {
  return jose.exportJWK(key);
}).then(jwk => {
  console.log(JSON.stringify(jwk, null, 2));
});
"
```

5. Update netlify/functions/jwks.ts  
   
    Replace `PUBLIC_JWK` with the output from step 4.

6. Create .env

```bash
VITE_LOCAL_MOCK=false
VITE_API_BASE=/.netlify/functions

# Database (choose one)
NETLIFY_DATABASE_URL=postgresql://user:pass@host/db  # Neon
# NETLIFY_DATABASE_URL=postgresql://localhost/atlast_dev  # Local

# OAuth (paste your private key)
OAUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----"

# Local URLs (MUST use 127.0.0.1 for OAuth)
URL=http://127.0.0.1:8888
DEPLOY_URL=http://127.0.0.1:8888
DEPLOY_PRIME_URL=http://127.0.0.1:8888
CONTEXT=dev
```

7. Initialize Database
```bash
npm run init-db
```

8. Start Development Server
```bash
npm run dev:full
```

9. Test OAuth
    
   1. Open `http://127.0.0.1:8888` (NOT localhost)
   2. Enter your real Bluesky handle
   3. Authorize the app
   4. You should be redirected back and logged in

---

## Project Structure

```
atlast/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom hooks
│   ├── lib/
│   │   ├── apiClient/  # API client (real + mock)
│   │   ├── platforms/  # File parsers
│   │   └── config.ts   # Environment config
│   └── types/          # TypeScript types
├── netlify/
│   └── functions/      # Backend API
├── scripts/            # Build scripts
└── test-data/          # Sample upload files (git-ignored)
```

---

## Task Workflows

### Adding a New Social Platform

1. Create `src/lib/platforms/yourplatform.ts`
2. Implement parser following `tiktok.ts` or `instagram.ts`
3. Register in `src/lib/platforms/registry.ts`
4. Update `src/constants/platforms.ts`
5. Test with real data file

### Adding a New API Endpoint

1. Create `netlify/functions/your-endpoint.ts`
2. Add authentication check (copy from existing)
3. Update `src/lib/apiClient/realApiClient.ts`
4. Update `src/lib/apiClient/mockApiClient.ts`
5. Use in components via `apiClient.yourMethod()`

### Styling Changes

- Use Tailwind utility classes
- Follow dark mode pattern: `class="bg-white dark:bg-gray-800"`
- Test in both light and dark modes
- Mobile-first responsive design
- Check accessibility (if implemented) is retained

---

## Submitting Changes

### Before Submitting

- [ ] Test in mock mode: `npm run dev:mock`
- [ ] Test in full mode (if backend changes): `npm run dev:full`
- [ ] Check both light and dark themes
- [ ] Test mobile responsiveness
- [ ] No console errors
- [ ] Code follows existing patterns

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Commit with clear messages
5. Push to your fork
6. Open a Pull Request

### PR Description Should Include

- What changes were made
- Why these changes are needed
- Screenshots (for UI changes)
- Testing steps
- Related issues

---

## Resources

- [AT Protocol Docs](https://atproto.com)
- [Bluesky API](https://docs.bsky.app)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Netlify Functions](https://docs.netlify.com/functions/overview)

---

Thank you for contributing to ATlast!