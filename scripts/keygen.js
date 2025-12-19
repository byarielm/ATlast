import { generateKeyPair, exportJWK, exportPKCS8 } from "jose";
import { writeFileSync } from "fs";

async function generateKeys() {
  // Generate ES256 key pair (recommended by atproto)
  const { publicKey, privateKey } = await generateKeyPair("ES256", {
    extractable: true,
  });

  // Export public key as JWK (for client-metadata.json)
  const publicJWK = await exportJWK(publicKey);
  publicJWK.kid = "main-key"; // Key ID
  publicJWK.use = "sig"; // Signature use
  publicJWK.alg = "ES256";

  // Export private key as PKCS8 (for environment variable)
  const privateKeyPem = await exportPKCS8(privateKey);

  console.log("\n=== PUBLIC KEY (JWK) ===");
  console.log("Add this to your client-metadata.json jwks.keys array:");
  console.log(JSON.stringify(publicJWK, null, 2));

  console.log("\n=== PRIVATE KEY (PEM) ===");
  console.log(
    "Add this to Netlify environment variables as OAUTH_PRIVATE_KEY:",
  );
  console.log(privateKeyPem);

  // Save to files for reference
  writeFileSync("public-jwk.json", JSON.stringify(publicJWK, null, 2));
  writeFileSync("private-key.pem", privateKeyPem);

  console.log("\n✅ Keys saved to public-jwk.json and private-key.pem");
  console.log("⚠️  Keep private-key.pem SECRET! Add it to .gitignore");
}

generateKeys().catch(console.error);
