import apiClient, { clearTokens, setTokens } from '@/lib/apiClient'
import type { LoginResponse, RefreshResponse } from '@/types'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password })
  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken })
  } finally {
    clearTokens()
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  setTokens(data.access_token)
  return data
}
