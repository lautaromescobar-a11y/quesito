// Tipos mínimos de Google Identity Services (lo que usa Quesito).
interface RespuestaTokenGoogle {
  access_token?: string
  expires_in?: number | string
  scope?: string
  error?: string
}

interface ClienteTokenGoogle {
  requestAccessToken(opciones?: { prompt?: string }): void
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string
          scope: string
          callback: (r: RespuestaTokenGoogle) => void
          error_callback?: (e: { type: string }) => void
        }): ClienteTokenGoogle
        hasGrantedAllScopes(r: RespuestaTokenGoogle, ...permisos: string[]): boolean
        revoke(token: string, hecho: () => void): void
      }
    }
  }
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string
}
