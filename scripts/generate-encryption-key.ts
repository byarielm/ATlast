import { randomBytes } from "crypto";

/**
 * Generate encryption key for token storage
 * Run once: npx tsx scripts/generate-encryption-key.ts
 */

const key = randomBytes(32).toString("hex");

console.log("\n🔐 TOKEN ENCRYPTION KEY GENERATED\n");
console.log("Add this to your .env file and Netlify environment variables:\n");
console.log(`TOKEN_ENCRYPTION_KEY=${key}\n`);
console.log("⚠️  IMPORTANT:");
console.log("1. Keep this key secret and secure");
console.log("2. Never commit this to git");
console.log(
  "3. Use the same key across all environments to decrypt existing tokens",
);
console.log(
  "4. If you lose this key, all encrypted tokens will be unrecoverable\n",
);
