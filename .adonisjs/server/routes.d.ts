import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'oauth.show_login': { paramsTuple?: []; params?: {} }
    'oauth.handle_logout': { paramsTuple?: []; params?: {} }
    'oauth.handle_login': { paramsTuple?: []; params?: {} }
    'oauth.handle_signup': { paramsTuple?: []; params?: {} }
    'oauth.callback': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'oauth.show_login': { paramsTuple?: []; params?: {} }
    'oauth.callback': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'oauth.show_login': { paramsTuple?: []; params?: {} }
    'oauth.callback': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'oauth.handle_logout': { paramsTuple?: []; params?: {} }
    'oauth.handle_login': { paramsTuple?: []; params?: {} }
    'oauth.handle_signup': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}