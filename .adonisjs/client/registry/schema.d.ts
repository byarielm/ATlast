/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'login': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['showLogin']>>>
    }
  }
  'oauth.logout': {
    methods: ["POST"]
    pattern: '/oauth/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['handleLogout']>>>
    }
  }
  'oauth.login': {
    methods: ["POST"]
    pattern: '/oauth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/oauth').loginRequestValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/oauth').loginRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['handleLogin']>>>
    }
  }
  'oauth.signup': {
    methods: ["POST"]
    pattern: '/oauth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/oauth').signupRequestValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/oauth').signupRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['handleSignup']>>>
    }
  }
  'oauth.callback': {
    methods: ["GET","HEAD"]
    pattern: '/oauth/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oauth_controller').default['callback']>>>
    }
  }
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
    }
  }
}
