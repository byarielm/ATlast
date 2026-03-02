import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'login': { paramsTuple?: []; params?: {} }
    'oauth.logout': { paramsTuple?: []; params?: {} }
    'oauth.login': { paramsTuple?: []; params?: {} }
    'oauth.signup': { paramsTuple?: []; params?: {} }
    'oauth.callback': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'login': { paramsTuple?: []; params?: {} }
    'oauth.callback': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'login': { paramsTuple?: []; params?: {} }
    'oauth.callback': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'oauth.logout': { paramsTuple?: []; params?: {} }
    'oauth.login': { paramsTuple?: []; params?: {} }
    'oauth.signup': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}