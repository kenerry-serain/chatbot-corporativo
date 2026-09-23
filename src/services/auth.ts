import { confirmResetPassword, fetchAuthSession, getCurrentUser, resetPassword, signIn, signOut } from 'aws-amplify/auth'
import { appConfig } from '../config'

export interface AppUser {
  id: string
  email: string
  name?: string
}

const TEMPORARY_SESSION_KEY = 'autoatende:temporary-session'
const ACTIVE_TAB_KEY = 'autoatende:active-tab'

function userFromToken(userId: string, fallbackEmail: string, payload?: Record<string, unknown>): AppUser {
  return {
    id: userId,
    email: typeof payload?.email === 'string' ? payload.email : fallbackEmail,
    name: typeof payload?.name === 'string' ? payload.name : undefined,
  }
}

export async function getSignedInUser(): Promise<AppUser | null> {
  if (!appConfig.cognito.isConfigured) return null
  try {
    if (localStorage.getItem(TEMPORARY_SESSION_KEY) === 'true' && sessionStorage.getItem(ACTIVE_TAB_KEY) !== 'true') {
      await signOut()
      localStorage.removeItem(TEMPORARY_SESSION_KEY)
      return null
    }
    const [currentUser, session] = await Promise.all([getCurrentUser(), fetchAuthSession()])
    return userFromToken(currentUser.userId, currentUser.signInDetails?.loginId || currentUser.username, session.tokens?.idToken?.payload)
  } catch {
    return null
  }
}

export async function login(email: string, password: string, remember: boolean): Promise<AppUser> {
  const result = await signIn({ username: email.trim(), password })
  if (!result.isSignedIn) {
    if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') throw new Error('Sua conta exige a definição de uma nova senha no primeiro acesso.')
    throw new Error('Este acesso precisa de uma etapa adicional de confirmação no Cognito.')
  }
  if (!remember) {
    localStorage.setItem(TEMPORARY_SESSION_KEY, 'true')
    sessionStorage.setItem(ACTIVE_TAB_KEY, 'true')
  } else {
    localStorage.removeItem(TEMPORARY_SESSION_KEY)
    sessionStorage.removeItem(ACTIVE_TAB_KEY)
  }
  const user = await getSignedInUser()
  if (!user) throw new Error('Não foi possível carregar os dados da sua conta.')
  return user
}

export async function logout() {
  localStorage.removeItem(TEMPORARY_SESSION_KEY)
  sessionStorage.removeItem(ACTIVE_TAB_KEY)
  if (appConfig.cognito.isConfigured) await signOut()
}

export async function requestPasswordReset(email: string) {
  await resetPassword({ username: email.trim() })
}

export async function completePasswordReset(email: string, code: string, newPassword: string) {
  await confirmResetPassword({ username: email.trim(), confirmationCode: code.trim(), newPassword })
}

export async function getIdToken() {
  if (!appConfig.cognito.isConfigured) return null
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString() || null
}
