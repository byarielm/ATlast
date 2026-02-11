/**
 * Auth Response Schemas
 * Validates auth endpoint responses (session, logout, oauth-start, client-metadata, jwks)
 */

import { z } from 'zod';
import { BaseSuccessSchema, ErrorResponseSchema } from './common.schema';

/** Successful session response */
export const SessionSuccessSchema = BaseSuccessSchema.extend({
  data: z.object({
    did: z.string().startsWith('did:'),
    sessionId: z.string(),
  }),
});

/** Session error response (401) */
export const SessionErrorSchema = ErrorResponseSchema;

/** Successful logout response */
export const LogoutSuccessSchema = BaseSuccessSchema;

/** Successful oauth-start response */
export const OAuthStartSuccessSchema = BaseSuccessSchema.extend({
  data: z.object({
    url: z.string(),
  }),
});

/** JWK entry in JWKS response */
export const JwkSchema = z.object({
  kty: z.string(),
  x: z.string(),
  y: z.string(),
  crv: z.string(),
  kid: z.string(),
  use: z.string(),
  alg: z.string(),
});

/** JWKS response */
export const JwksResponseSchema = z.object({
  keys: z.array(JwkSchema).min(1),
});

/** Loopback (dev) client metadata */
export const ClientMetadataLoopbackSchema = z.object({
  client_id: z.string(),
  client_name: z.string(),
  client_uri: z.string(),
  redirect_uris: z.array(z.string()).min(1),
  scope: z.string(),
  grant_types: z.array(z.string()),
  response_types: z.array(z.string()),
  application_type: z.literal('web'),
  token_endpoint_auth_method: z.literal('none'),
  dpop_bound_access_tokens: z.literal(true),
});

/** Production client metadata (includes jwks_uri and logo_uri) */
export const ClientMetadataProductionSchema = z.object({
  client_id: z.string(),
  client_name: z.string(),
  client_uri: z.string(),
  redirect_uris: z.array(z.string()).min(1),
  logo_uri: z.string(),
  scope: z.string(),
  grant_types: z.array(z.string()),
  response_types: z.array(z.string()),
  application_type: z.literal('web'),
  token_endpoint_auth_method: z.literal('private_key_jwt'),
  token_endpoint_auth_signing_alg: z.literal('ES256'),
  dpop_bound_access_tokens: z.literal(true),
  jwks_uri: z.string(),
});

/** Client metadata error (missing host) */
export const ClientMetadataErrorSchema = z.object({
  error: z.string(),
});
