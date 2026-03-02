/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'oauth.show_login': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['oauth.show_login']['types'],
  },
  'oauth.handle_logout': {
    methods: ["POST"],
    pattern: '/oauth/logout',
    tokens: [{"old":"/oauth/logout","type":0,"val":"oauth","end":""},{"old":"/oauth/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['oauth.handle_logout']['types'],
  },
  'oauth.handle_login': {
    methods: ["POST"],
    pattern: '/oauth/login',
    tokens: [{"old":"/oauth/login","type":0,"val":"oauth","end":""},{"old":"/oauth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['oauth.handle_login']['types'],
  },
  'oauth.handle_signup': {
    methods: ["POST"],
    pattern: '/oauth/signup',
    tokens: [{"old":"/oauth/signup","type":0,"val":"oauth","end":""},{"old":"/oauth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['oauth.handle_signup']['types'],
  },
  'oauth.callback': {
    methods: ["GET","HEAD"],
    pattern: '/oauth/callback',
    tokens: [{"old":"/oauth/callback","type":0,"val":"oauth","end":""},{"old":"/oauth/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['oauth.callback']['types'],
  },
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
