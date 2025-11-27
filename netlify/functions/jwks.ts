import { Handler } from "@netlify/functions";

const PUBLIC_JWK = {
  kty: "EC",
  x: "3sVbr4xwN7UtmG1L19vL0x9iN-FRcl7p-Wja_xPbhhk",
  y: "Y1XKDaAyDwijp8aEIGHmO46huKjajSQH2cbfpWaWpQ4",
  crv: "P-256",
  kid: "main-key",
  use: "sig",
  alg: "ES256",
};
export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
    body: JSON.stringify({ keys: [PUBLIC_JWK] }),
  };
};
