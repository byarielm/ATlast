#!/usr/bin/env tsx
/**
 * Test Login Helper
 *
 * This script helps you obtain a real Bluesky session for integration testing.
 * It guides you through the OAuth flow and saves the session ID for use in tests.
 *
 * Usage:
 *   pnpm test:login
 *
 * After running, set the TEST_SESSION environment variable:
 *   PowerShell: $env:TEST_SESSION="<session-id>"; pnpm test
 *   CMD: set TEST_SESSION=<session-id> && pnpm test
 *   Bash: TEST_SESSION=<session-id> pnpm test
 */

import "dotenv/config";
import * as readline from "readline";
import { db } from "../src/db/client";
import app from "../src/server";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n🔐 ATlast Test Login Helper\n");
  console.log("This will help you get a real Bluesky session for testing.");
  console.log("You'll need to authorize ATlast with your Bluesky account.\n");
  console.log("─".repeat(60));

  // Step 1: Get user's handle
  const handle = await ask(
    "\n📝 Enter your Bluesky handle (e.g., yourname.bsky.social): "
  );

  if (!handle) {
    console.error("❌ Handle is required");
    process.exit(1);
  }

  console.log(`\n⏳ Starting OAuth flow for: ${handle}`);

  try {
    // Step 2: Call our OAuth start endpoint
    const startRes = await app.request("/api/auth/oauth-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_hint: handle }),
    });

    if (!startRes.ok) {
      const error = await startRes.json();
      throw new Error(error.error || "Failed to start OAuth");
    }

    const { data } = await startRes.json();
    const authUrl = data.url;

    console.log("\n" + "─".repeat(60));
    console.log("\n🌐 Step 1: Open this URL in your browser:\n");
    console.log(`   ${authUrl}`);
    console.log(
      "\n📋 (Copy the URL above - it's also copied to clipboard if supported)"
    );

    // Try to copy to clipboard (Windows)
    try {
      const { exec } = await import("child_process");
      exec(`echo ${authUrl} | clip`, (err) => {
        if (!err) console.log("   ✅ URL copied to clipboard!");
      });
    } catch {
      // Clipboard copy failed, that's ok
    }

    console.log("\n" + "─".repeat(60));
    console.log("\n🔑 Step 2: After authorizing, you'll be redirected to a URL.");
    console.log("   Copy the FULL URL from your browser's address bar.");
    console.log(
      "   It will look like: http://127.0.0.1:3000/api/auth/oauth-callback?code=...&state=...\n"
    );

    const callbackUrl = await ask("📋 Paste the full callback URL here: ");

    if (!callbackUrl) {
      console.error("❌ Callback URL is required");
      process.exit(1);
    }

    // Step 3: Parse the callback URL and extract session
    const url = new URL(callbackUrl);
    let sessionId: string | null = null;

    // Check if this is the final redirect (has session param)
    if (url.searchParams.has("session")) {
      sessionId = url.searchParams.get("session");
    }
    // Check if this is the OAuth callback (has code and state)
    else if (url.searchParams.has("code") && url.searchParams.has("state")) {
      console.log("\n⏳ Processing OAuth callback...");

      // Call our callback endpoint to exchange the code
      const callbackPath = url.pathname + url.search;
      const callbackRes = await app.request(callbackPath, {
        method: "GET",
        headers: {
          // Simulate the host header for proper OAuth config
          Host: url.host,
        },
      });

      // The callback returns a redirect with the session in the URL
      if (callbackRes.status === 302 || callbackRes.status === 301) {
        const redirectUrl = callbackRes.headers.get("Location");
        if (redirectUrl) {
          const redirectParsed = new URL(redirectUrl, url.origin);
          sessionId = redirectParsed.searchParams.get("session");

          if (!sessionId && redirectParsed.searchParams.has("error")) {
            throw new Error(
              `OAuth failed: ${redirectParsed.searchParams.get("error")}`
            );
          }
        }
      } else {
        // Try to get error from response body
        const body = await callbackRes.text();
        throw new Error(`Callback failed (${callbackRes.status}): ${body}`);
      }
    }
    // Maybe they pasted just the session ID
    else if (callbackUrl.match(/^[0-9a-f-]{36}$/i)) {
      sessionId = callbackUrl;
    }

    if (!sessionId) {
      console.error("\n❌ Could not extract session from URL");
      console.error("   Expected either:");
      console.error(
        "   - Callback URL: http://127.0.0.1:3000/api/auth/oauth-callback?code=...&state=..."
      );
      console.error("   - Final URL: http://127.0.0.1:3000/?session=<uuid>");
      console.error("   - Just the session ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
      process.exit(1);
    }

    // Step 4: Verify the session works
    console.log("\n⏳ Verifying session...");

    const verifyRes = await app.request(`/api/auth/session?session=${sessionId}`);
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      console.error("❌ Session verification failed:", verifyData.error);
      process.exit(1);
    }

    console.log("\n" + "─".repeat(60));
    console.log("\n✅ Session verified successfully!\n");
    console.log(`   DID: ${verifyData.data.did}`);
    console.log(`   Session ID: ${sessionId}`);

    // Step 5: Show how to use it
    console.log("\n" + "─".repeat(60));
    console.log("\n📋 To use this session in tests:\n");

    console.log("   PowerShell:");
    console.log(`   $env:TEST_SESSION="${sessionId}"; pnpm test\n`);

    console.log("   CMD:");
    console.log(`   set TEST_SESSION=${sessionId} && pnpm test\n`);

    console.log("   Bash/Zsh:");
    console.log(`   TEST_SESSION=${sessionId} pnpm test\n`);

    console.log("   Or add to your .env file:");
    console.log(`   TEST_SESSION=${sessionId}\n`);

    console.log("─".repeat(60));
    console.log(
      "\n💡 Tip: The session lasts 7 days. Run this script again to get a new one.\n"
    );

    // Offer to save to .env.test
    const saveToFile = await ask("Save session to .env.test file? (y/N): ");

    if (saveToFile.toLowerCase() === "y") {
      const fs = await import("fs");
      const path = await import("path");
      const envTestPath = path.join(process.cwd(), ".env.test");

      let content = "";
      try {
        content = fs.readFileSync(envTestPath, "utf-8");
      } catch {
        // File doesn't exist yet
      }

      // Update or add TEST_SESSION
      if (content.includes("TEST_SESSION=")) {
        content = content.replace(/TEST_SESSION=.*/g, `TEST_SESSION=${sessionId}`);
      } else {
        content += `\nTEST_SESSION=${sessionId}\n`;
      }

      fs.writeFileSync(envTestPath, content.trim() + "\n");
      console.log(`\n✅ Saved to ${envTestPath}`);
      console.log(
        '   Load it with: source .env.test (Bash) or Get-Content .env.test | ForEach-Object { $_ -replace "^", "`$env:" } | Invoke-Expression (PowerShell)\n'
      );
    }
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
    // Close database connection
    await db.destroy();
  }
}

main().catch(console.error);
