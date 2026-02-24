import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'

type NavKey = 'welcome' | 'content' | 'branches' | 'menus' | 'users' | 'company'
type MenuTab = 'menu' | 'category' | 'product'
type BranchModalTab = 'branch' | 'order' | 'hours'
type CategoryMatchTab = 'menu' | 'product'
type PageSectionKey = 'landing-page' | 'menu' | 'branches' | 'contact'

const NAV_ITEMS: Array<{ key: NavKey; label: string }> = [
  { key: 'welcome', label: 'Genel Bakis' },
  { key: 'content', label: 'İçerik Yönetimi' },
  { key: 'branches', label: 'Şubeler' },
  { key: 'menus', label: 'Menu Yonetimi' },
  { key: 'users', label: 'Kullanicilar' },
  { key: 'company', label: 'Firma Bilgileri' },
]
const NAV_HASH_MAP: Record<NavKey, string> = {
  welcome: '#/welcome',
  content: '#/icerik-yonetimi',
  branches: '#/subeler',
  menus: '#/menu',
  users: '#/kullanicilar',
  company: '#/firma',
}

const BRANCH_DAY_KEYS = ['pzt', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cmt', 'pazar'] as const
const BRANCH_DAY_LABELS: Record<(typeof BRANCH_DAY_KEYS)[number], string> = {
  pzt: 'Pazartesi',
  salı: 'Salı',
  çarşamba: 'Çarşamba',
  perşembe: 'Perşembe',
  cuma: 'Cuma',
  cmt: 'Cumartesi',
  pazar: 'Pazar',
}
const CONTACT_REQUEST_TYPE_LABELS: Record<string, string> = {
  SUGGESTION: 'Öneri',
  COMPLAINT: 'Şikayet',
  THANKS: 'Teşekkür',
}
const PAGE_SECTION_CONFIG: Array<{ key: PageSectionKey; label: string; helper: string }> = [
  {
    key: 'landing-page',
    label: 'Ana Sayfa',
    helper: 'Açılış ve hero alanı metinleri',
  },
  {
    key: 'menu',
    label: 'Menu',
    helper: 'Menu sayfası üst içerikleri',
  },
  {
    key: 'branches',
    label: 'Şube',
    helper: 'Şubeler sayfası giriş alanı',
  },
  {
    key: 'contact',
    label: 'İletişim',
    helper: 'İletişim sayfası başlık ve etiketler',
  },
]

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
const TOKEN_KEY = 'cafe_admin_token'
const DEFAULT_API_BASE = ''
const USER_ROLE_OPTIONS = ['admin'] as const

type BranchLocation = { lat?: number; lon?: number }
type BranchWorkingHour = { day?: string; open?: string; close?: string; isOpen?: boolean }
type BranchWorkingHourRow = { day: string; open: string; close: string; isOpen: boolean }
type BranchOrderLinks = {
  hasValue?: boolean
  yemeksepeti?: string
  getir?: string
  trendyolYemek?: string
}
type BranchPayload = {
  name?: string
  imageUrl?: string
  city?: string
  district?: string
  isOpen: boolean
  location: BranchLocation
  workingHours?: BranchWorkingHour[]
  orderLinks: BranchOrderLinks
}

type MenuPayload = {
  title?: string
  description?: string
  imageUrl?: string
  active: boolean
}

type CategoryPayload = {
  name?: string
  order: number
  imageUrl?: string
}

type ProductPayload = {
  name?: string
  description?: string
  price: number
  discountedPrice?: number | null
  inStock: boolean
  imageUrl?: string
  nutrition?: Record<string, unknown>
}

type UserPayload = {
  username?: string
  password?: string
  role?: string
}

type ContactPayload = {
  phone?: string
  email?: string
  social: {
    hasValue?: boolean
    instagram?: string
    x?: string
    tiktok?: string
    facebook?: string
    whatsapp?: string
  }
  orderLinks: {
    hasValue?: boolean
    yemeksepeti?: string
    getir?: string
    trendyolYemek?: string
  }
}

type PageSectionPayload = {
  title: string
  description: string
  imageUrl: string
  tags: string[]
}

type ApiError = Error & { status?: number }

function createDefaultWorkingHours(): BranchWorkingHourRow[] {
  return BRANCH_DAY_KEYS.map((day) => ({ day, open: '', close: '', isOpen: true }))
}

function createEmptyPageSection(): PageSectionPayload {
  return {
    title: '',
    description: '',
    imageUrl: '',
    tags: [],
  }
}

function createInitialPageSections(): Record<PageSectionKey, PageSectionPayload> {
  return {
    'landing-page': createEmptyPageSection(),
    menu: createEmptyPageSection(),
    branches: createEmptyPageSection(),
    contact: createEmptyPageSection(),
  }
}

function normalizePageSection(value: unknown): PageSectionPayload {
  const obj = extractObject(value)
  const tagsValue = getValue(obj, 'tags')
  const tags = Array.isArray(tagsValue)
    ? tagsValue.map((tag) => String(tag ?? '').trim()).filter(Boolean)
    : []

  return {
    title: String(getValue(obj, 'title') ?? ''),
    description: String(getValue(obj, 'description') ?? ''),
    imageUrl: String(getValue(obj, 'imageUrl') ?? ''),
    tags,
  }
}

function parseTagsInput(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function resolveUploadedImageUrl(payload: unknown) {
  if (typeof payload === 'string') {
    return payload.trim().replace(/^"|"$/g, '')
  }

  const obj = extractObject(payload)
  const raw =
    getValue(obj, 'url') ??
    getValue(obj, 'imageUrl') ??
    getValue(obj, 'fileUrl') ??
    getValue(obj, 'path') ??
    getValue(getObject(obj, 'data'), 'url', 'imageUrl', 'fileUrl', 'path')

  return String(raw ?? '').trim()
}

async function uploadImage(file: File, token: string) {
  const url = `${getApiBase()}/api/v1/uploads/image`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('image', file)

  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    const error = new Error(text || `${response.status} ${response.statusText} - ${url}`) as ApiError
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  const imageUrl = resolveUploadedImageUrl(payload)

  if (!imageUrl) {
    throw new Error(`Gorsel URL cozumlenemedi. Upload response: ${toPretty(payload)}`)
  }

  return imageUrl
}

function normalizeDayKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
}

function normalizeWorkingHoursRows(incoming: unknown): BranchWorkingHourRow[] {
  const rows = Array.isArray(incoming) ? incoming : []
  const byDay = new Map<string, BranchWorkingHourRow>()

  rows.forEach((item) => {
    const day = String(getValue(item, 'day') ?? '').trim()
    if (!day) return
    byDay.set(normalizeDayKey(day), {
      day,
      open: String(getValue(item, 'open') ?? ''),
      close: String(getValue(item, 'close') ?? ''),
      isOpen: getValue(item, 'isOpen') === undefined ? true : Boolean(getValue(item, 'isOpen')),
    })
  })

  return BRANCH_DAY_KEYS.map((dayKey) => {
    const existing = byDay.get(normalizeDayKey(dayKey))
    return existing
      ? {
          day: dayKey,
          open: existing.open,
          close: existing.close,
          isOpen: existing.isOpen,
        }
      : {
          day: dayKey,
          open: '',
          close: '',
          isOpen: true,
        }
  })
}

function getBranchDayLabel(day: string) {
  return BRANCH_DAY_LABELS[day as keyof typeof BRANCH_DAY_LABELS] ?? day
}

function getContactRequestTypeLabel(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  return CONTACT_REQUEST_TYPE_LABELS[raw.toUpperCase()] ?? raw
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D+/g, '')
}

function sanitizeDecimalInput(value: string, allowNegative = false) {
  let cleaned = value.replace(/[^0-9.-]/g, '')
  cleaned = cleaned.replace(/,/g, '')
  cleaned = cleaned.replace(/(\..*)\./g, '$1')
  if (allowNegative) {
    cleaned = cleaned.replace(/(?!^)-/g, '')
  } else {
    cleaned = cleaned.replace(/-/g, '')
  }
  if (cleaned.startsWith('.')) cleaned = `0${cleaned}`
  if (cleaned === '-.') cleaned = '-0.'
  return cleaned
}

function getNavFromHash(hash: string): NavKey {
  const normalized = hash.replace(/^#\/?/, '').trim().toLocaleLowerCase('tr-TR')
  const matched = (Object.entries(NAV_HASH_MAP) as Array<[NavKey, string]>).find(([, value]) =>
    value.replace(/^#\/?/, '').toLocaleLowerCase('tr-TR') === normalized,
  )
  return matched?.[0] ?? 'welcome'
}

function normalizeBaseUrl(value?: string | null) {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function getApiBase() {
  const fromEnv = normalizeBaseUrl(API_BASE)
  return fromEnv || DEFAULT_API_BASE
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${getApiBase()}${path}`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    const error = new Error(text || `${response.status} ${response.statusText} - ${url}`) as ApiError
    error.status = response.status
    throw error
  }

  if (response.status === 204) {
    return null as T
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

function toPretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function getValue(obj: any, ...keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    if (key in obj) return obj[key]
    const found = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase())
    if (found) return obj[found]
  }
  return undefined
}

function getObject(obj: any, ...keys: string[]) {
  const value = getValue(obj, ...keys)
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

function extractArray(input: any, depth = 0): any[] {
  if (Array.isArray(input)) return input
  if (!input || typeof input !== 'object' || depth > 3) return []

  const preferred = ['data', 'items', 'result', 'results', 'value', 'payload', 'list', 'records']
  for (const key of preferred) {
    const next = getValue(input, key)
    if (next !== undefined) {
      const arr = extractArray(next, depth + 1)
      if (arr.length || Array.isArray(next)) return arr
    }
  }

  for (const value of Object.values(input)) {
    if (Array.isArray(value)) return value
  }

  return []
}

function extractObject(input: any, depth = 0): any | null {
  if (!input) return null
  if (Array.isArray(input)) return input[0] ?? null
  if (typeof input !== 'object' || depth > 3) return null

  const preferred = ['data', 'item', 'result', 'value', 'payload']
  for (const key of preferred) {
    const next = getValue(input, key)
    if (next !== undefined) {
      const obj = extractObject(next, depth + 1)
      if (obj) return obj
    }
  }
  return input
}

function getEntityId(item: any, fallback: string) {
  return String(getValue(item, 'id', '_id') ?? fallback)
}

function IconAddButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button className="icon-btn" onClick={onClick} disabled={disabled} title={label ?? 'Olustur'} aria-label={label ?? 'Olustur'}>
      +
    </button>
  )
}

function RefreshButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button className="refresh-btn" onClick={onClick} disabled={disabled} title="Yenile" aria-label="Yenile">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6v5h-5" />
        <path d="M20 11a8 8 0 1 0 2 5.5" />
      </svg>
    </button>
  )
}

function ActionIconButton({
  onClick,
  title,
  kind,
}: {
  onClick: () => void
  title: string
  kind: 'edit' | 'delete'
}) {
  return (
    <button className={kind === 'delete' ? 'icon-action-btn danger' : 'icon-action-btn'} onClick={onClick} title={title} aria-label={title}>
      {kind === 'edit' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4l10-10-4-4L4 16v4z" />
          <path d="M13 7l4 4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="M7 7l1 13h8l1-13" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      )}
    </button>
  )
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}) {
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (!message) return
    setIsLeaving(false)
    const timer = window.setTimeout(() => setIsLeaving(true), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!isLeaving) return
    const timer = window.setTimeout(() => onClose(), 220)
    return () => window.clearTimeout(timer)
  }, [isLeaving, onClose])

  if (!message) return null

  return (
    <div className={`toast ${type} ${isLeaving ? 'is-leaving' : 'is-entering'}`}>
      <p>{message}</p>
      <button className="toast-close" onClick={() => setIsLeaving(true)} aria-label="Bildirimi kapat" title="Kapat">
        ×
      </button>
    </div>
  )
}

function ToastStack({
  error,
  success,
  onCloseError,
  onCloseSuccess,
}: {
  error?: string
  success?: string
  onCloseError: () => void
  onCloseSuccess?: () => void
}) {
  if (!error && !success) return null
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {error ? <Toast message={error} type="error" onClose={onCloseError} /> : null}
      {success ? <Toast message={success} type="success" onClose={onCloseSuccess ?? (() => undefined)} /> : null}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="ghost-btn" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [activeNav, setActiveNav] = useState<NavKey>(() => getNavFromHash(window.location.hash))

  const handleLogin = (nextToken: string) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    window.location.hash = NAV_HASH_MAP.welcome
  }

  useEffect(() => {
    const handleHashChange = () => {
      setActiveNav(getNavFromHash(window.location.hash))
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const targetHash = NAV_HASH_MAP[activeNav]
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash)
    }
  }, [activeNav])

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  const activeLabel = NAV_ITEMS.find((item) => item.key === activeNav)?.label ?? 'Panel'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-kicker">Cafe Pub</p>
          <h1>Admin Panel</h1>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button key={item.key} className={activeNav === item.key ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveNav(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Cikis
        </button>
      </aside>

      <main className="content">
        <header className="content-topbar">
          <h2>{activeLabel}</h2>
          <p>Yonetim islemlerini tek panelden hizlica yonetin</p>
        </header>
        <div className="page-content">
          {activeNav === 'welcome' && <WelcomePage />}
          {activeNav === 'content' && <ContentManagementPage token={token} />}
          {activeNav === 'branches' && <BranchesPage token={token} />}
          {activeNav === 'menus' && <MenusPage token={token} />}
          {activeNav === 'users' && <UsersPage token={token} />}
          {activeNav === 'company' && <CompanyPage token={token} />}
        </div>
      </main>
    </div>
  )
}

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resolveTokenFromPayload = (data: any): string => {
    if (typeof data === 'string') {
      return data.trim().replace(/^"|"$/g, '')
    }
    return (
      data?.token ??
      data?.accessToken ??
      data?.jwt ??
      data?.bearerToken ??
      data?.data?.token ??
      data?.data?.accessToken ??
      data?.result?.token ??
      ''
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest<any>('/api/v1/auth/login', {
        method: 'POST',
        body: { username, password },
      })
      const nextToken = resolveTokenFromPayload(data)
      if (!nextToken || typeof nextToken !== 'string') {
        throw new Error(`Token alinamadi. /api/v1/auth/login response: ${toPretty(data)}`)
      }
      onLogin(nextToken)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giris basarisiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h2>Yonetici Girisi</h2>
        <p className="muted">Kullanici adi ve sifre ile giris yapin</p>
        <label>
          Kullanici Adi
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Sifre
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="primary-btn" disabled={loading}>
          {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
        </button>
      </form>
      <ToastStack error={error} onCloseError={() => setError('')} />
    </div>
  )
}

function WelcomePage() {
  return (
    <section className="card welcome-card">
      <h2>Panel Ozeti</h2>
      <p>Tum CRUD islemlerini sol menuden yonetebilirsiniz. Olusturma butonlari her listede sag ustte + ikonu olarak bulunur.</p>
    </section>
  )
}

function BranchesPage({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [branchModalTab, setBranchModalTab] = useState<BranchModalTab>('branch')
  const [isUploadingBranchImage, setIsUploadingBranchImage] = useState(false)

  const [formId, setFormId] = useState('')
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [workingHoursRows, setWorkingHoursRows] = useState<BranchWorkingHourRow[]>(createDefaultWorkingHours())
  const [orderHasValue, setOrderHasValue] = useState(false)
  const [yemeksepeti, setYemeksepeti] = useState('')
  const [getir, setGetir] = useState('')
  const [trendyol, setTrendyol] = useState('')

  const payload = useMemo<BranchPayload>(
    () => ({
      name,
      imageUrl,
      city,
      district,
      isOpen,
      location: { lat: lat ? Number(lat) : undefined, lon: lon ? Number(lon) : undefined },
      workingHours: workingHoursRows.map((row) => ({
        day: row.day,
        isOpen: row.isOpen,
        open: row.open || '00:00',
        close: row.close || '00:00',
      })),
      orderLinks: { hasValue: orderHasValue, yemeksepeti, getir, trendyolYemek: trendyol },
    }),
    [name, imageUrl, city, district, isOpen, lat, lon, workingHoursRows, orderHasValue, yemeksepeti, getir, trendyol],
  )

  const load = async () => {
    setError('')
    try {
      const data = await apiRequest<any>('/api/v1/branches', { token })
      setItems(extractArray(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sube listesi alinamadi')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const resetForm = () => {
    setFormId('')
    setName('')
    setImageUrl('')
    setCity('')
    setDistrict('')
    setIsOpen(true)
    setLat('')
    setLon('')
    setWorkingHoursRows(createDefaultWorkingHours())
    setOrderHasValue(false)
    setYemeksepeti('')
    setGetir('')
    setTrendyol('')
  }

  const fillFromItem = (item: any) => {
    setFormId(String(getValue(item, 'id', '_id') ?? ''))
    const location = getObject(item, 'location')
    const orderLinks = getObject(item, 'orderLinks')
    setName(String(getValue(item, 'name') ?? ''))
    setImageUrl(String(getValue(item, 'imageUrl') ?? ''))
    setCity(String(getValue(item, 'city') ?? ''))
    setDistrict(String(getValue(item, 'district') ?? ''))
    setIsOpen(getValue(item, 'isOpen') === undefined ? true : Boolean(getValue(item, 'isOpen')))
    setLat(getValue(location, 'lat') !== undefined ? String(getValue(location, 'lat')) : '')
    setLon(getValue(location, 'lon') !== undefined ? String(getValue(location, 'lon')) : '')
    setWorkingHoursRows(normalizeWorkingHoursRows(getValue(item, 'workingHours')))
    setOrderHasValue(Boolean(getValue(orderLinks, 'hasValue')))
    setYemeksepeti(String(getValue(orderLinks, 'yemeksepeti') ?? ''))
    setGetir(String(getValue(orderLinks, 'getir') ?? ''))
    setTrendyol(String(getValue(orderLinks, 'trendyolYemek') ?? ''))
  }

  const submitCreate = async () => {
    setError('')
    setStatus('')
    try {
      await apiRequest('/api/v1/branches', { method: 'POST', token, body: payload })
      setStatus('Sube olusturuldu')
      setMode(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sube olusturulamadi')
    }
  }

  const submitUpdate = async () => {
    if (!formId) {
      setError('Guncelleme icin ID gerekli')
      return
    }
    setError('')
    setStatus('')
    try {
      await apiRequest(`/api/v1/branches/${formId}`, { method: 'PUT', token, body: payload })
      setStatus('Sube guncellendi')
      setMode(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sube guncellenemedi')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm(`Sube silinsin mi? (${id})`)) return
    setError('')
    setStatus('')
    try {
      await apiRequest(`/api/v1/branches/${id}`, { method: 'DELETE', token })
      setStatus('Sube silindi')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sube silinemedi')
    }
  }

  return (
    <section className="card">
      <div className="row between">
        <h2>Şubeler</h2>
        <div className="actions">
          <RefreshButton onClick={() => void load()} />
          <IconAddButton
            onClick={() => {
              resetForm()
              setBranchModalTab('branch')
              setMode('create')
            }}
            label="Şube oluştur"
          />
        </div>
      </div>
      <ToastStack error={error} success={status} onCloseError={() => setError('')} onCloseSuccess={() => setStatus('')} />
      <table>
        <thead>
          <tr>
            <th>Şube</th>
            <th>Konum</th>
            <th>Islem</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const id = getEntityId(item, String(idx))
            const locationObj = getObject(item, 'location')
            const location = locationObj
              ? `${getValue(locationObj, 'lat') ?? '-'}, ${getValue(locationObj, 'lon') ?? '-'}`
              : `${getValue(item, 'city') ?? '-'} / ${getValue(item, 'district') ?? '-'}`
            return (
              <tr key={id}>
                <td>{String(getValue(item, 'name') ?? '-')}</td>
                <td>{location}</td>
                <td className="actions">
                  <ActionIconButton
                    kind="edit"
                    title="Düzenle"
                    onClick={() => {
                      fillFromItem(item)
                      setBranchModalTab('branch')
                      setMode('edit')
                    }}
                  />
                  <ActionIconButton kind="delete" title="Sil" onClick={() => void remove(id)} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {mode && (
        <Modal title={mode === 'create' ? 'Şube Oluştur' : `Şube Düzenle (${formId})`} onClose={() => setMode(null)}>
          <div className="row modal-tabs">
            <button className={branchModalTab === 'branch' ? 'active-tab' : ''} onClick={() => setBranchModalTab('branch')}>
              Şube Bilgileri
            </button>
            <button className={branchModalTab === 'order' ? 'active-tab' : ''} onClick={() => setBranchModalTab('order')}>
              Sipariş Bilgileri
            </button>
            <button className={branchModalTab === 'hours' ? 'active-tab' : ''} onClick={() => setBranchModalTab('hours')}>
              Şube Çalışma Saatleri
            </button>
          </div>

          {branchModalTab === 'branch' && (
            <div className="stack">
              <div className="toggle-row">
                <label className="checkbox setting-toggle">
                  Şube Açık
                  <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
                </label>
              </div>
              <div className="grid-2">
                <label>
                  Şube Adı
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  Şube Görseli
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        setError('')
                        setStatus('')
                        setIsUploadingBranchImage(true)
                        const uploadedImageUrl = await uploadImage(file, token)
                        setImageUrl(uploadedImageUrl)
                        setStatus('Sube gorseli yuklendi')
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Dosya yuklenemedi')
                      } finally {
                        setIsUploadingBranchImage(false)
                      }
                    }}
                  />
                  <small className="muted">
                    {isUploadingBranchImage ? 'Gorsel yukleniyor...' : 'Secilen gorsel otomatik olarak URL\'ye cevrilir.'}
                  </small>
                </label>
              <label>
                Şehir
                <input value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
              <label>
                İlçe
                <input value={district} onChange={(e) => setDistrict(e.target.value)} />
              </label>
              <label>
                Latitude
                <input value={lat} inputMode="decimal" onChange={(e) => setLat(sanitizeDecimalInput(e.target.value, true))} />
              </label>
              <label>
                Longitude
                  <input value={lon} inputMode="decimal" onChange={(e) => setLon(sanitizeDecimalInput(e.target.value, true))} />
              </label>
              </div>
            </div>
          )}

          {branchModalTab === 'order' && (
            <div className="order-panel">
              <label className="checkbox setting-toggle">
                Sipariş Linkleri Aktif?
                <input type="checkbox" checked={orderHasValue} onChange={(e) => setOrderHasValue(e.target.checked)} />
              </label>
              <div className="grid-2">
                <label>
                  Yemeksepeti
                  <input value={yemeksepeti} onChange={(e) => setYemeksepeti(e.target.value)} />
                </label>
                <label>
                  Getir
                  <input value={getir} onChange={(e) => setGetir(e.target.value)} />
                </label>
                <label>
                  Trendyol Yemek
                  <input value={trendyol} onChange={(e) => setTrendyol(e.target.value)} />
                </label>
              </div>
            </div>
          )}

          {branchModalTab === 'hours' && (
            <div className="hours-table-wrap">
              <table className="hours-table">
                <thead>
                  <tr>
                    <th>Gün</th>
                    <th>Açılış</th>
                    <th>Kapanış</th>
                    <th>Açık?</th>
                  </tr>
                </thead>
                <tbody>
                  {workingHoursRows.map((row, index) => (
                    <tr key={row.day}>
                      <td>{getBranchDayLabel(row.day)}</td>
                      <td>
                        <input
                          type="time"
                          step={60}
                          value={row.open}
                          onChange={(e) =>
                            setWorkingHoursRows((prev) =>
                              prev.map((x, i) => (i === index ? { ...x, open: e.target.value } : x)),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          step={60}
                          value={row.close}
                          onChange={(e) =>
                            setWorkingHoursRows((prev) =>
                              prev.map((x, i) => (i === index ? { ...x, close: e.target.value } : x)),
                            )
                          }
                        />
                      </td>
                      <td>
                        <label className="checkbox compact">
                          <input
                            type="checkbox"
                            checked={row.isOpen}
                            onChange={(e) =>
                              setWorkingHoursRows((prev) =>
                                prev.map((x, i) => (i === index ? { ...x, isOpen: e.target.checked } : x)),
                              )
                            }
                          />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {imageUrl && branchModalTab === 'branch' && <img className="thumb lg" src={imageUrl} alt="Şube görseli" />}
          <div className="actions">
            <button
              className="primary-btn"
              onClick={() => void (mode === 'create' ? submitCreate() : submitUpdate())}
              disabled={isUploadingBranchImage}
            >
              {isUploadingBranchImage ? 'Yukleniyor...' : mode === 'create' ? 'Oluştur' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function MenusPage({ token }: { token: string }) {
  const [tab, setTab] = useState<MenuTab>('menu')
  const [menus, setMenus] = useState<any[]>([])
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isUploadingMenuImage, setIsUploadingMenuImage] = useState(false)
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false)
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false)

  const [menuMode, setMenuMode] = useState<'create' | 'edit' | null>(null)
  const [menuId, setMenuId] = useState('')
  const [menuTitle, setMenuTitle] = useState('')
  const [menuDescription, setMenuDescription] = useState('')
  const [menuImage, setMenuImage] = useState('')
  const [menuActive, setMenuActive] = useState(true)

  const [categoryMode, setCategoryMode] = useState<'create' | 'edit' | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryOrder, setCategoryOrder] = useState('0')
  const [categoryImage, setCategoryImage] = useState('')

  const [productMode, setProductMode] = useState<'create' | 'edit' | null>(null)
  const [productId, setProductId] = useState('')
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productPrice, setProductPrice] = useState('0')
  const [productDiscountedPrice, setProductDiscountedPrice] = useState('')
  const [productInStock, setProductInStock] = useState(true)
  const [productImage, setProductImage] = useState('')
  const [servingSize, setServingSize] = useState('')
  const [caloriesKcal, setCaloriesKcal] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatG, setFatG] = useState('')
  const [sugarG, setSugarG] = useState('')
  const [fiberG, setFiberG] = useState('')
  const [sodiumMg, setSodiumMg] = useState('')
  const [energyKj, setEnergyKj] = useState('')
  const [allergensText, setAllergensText] = useState('')

  const [menuLinkState, setMenuLinkState] = useState<{
    id: string
    title: string
    targetCategoryId: string
    linkedCategories: any[]
    detailCategoryId: string
    detailProducts: any[]
  } | null>(null)
  const [linkCategoryState, setLinkCategoryState] = useState<{
    id: string
    name: string
    tab: CategoryMatchTab
    targetMenuId: string
    targetProductId: string
    linkedMenus: Array<{ id: string; title: string }>
    linkedProducts: any[]
  } | null>(null)
  const [linkProductState, setLinkProductState] = useState<{
    id: string
    name: string
    targetCategoryId: string
    linkedCategories: Array<{ id: string; name: string }>
  } | null>(null)

  const resetStatus = () => {
    setError('')
    setStatus('')
  }

  const loadMenus = async () => {
    try {
      const data = await apiRequest<any>('/api/v1/menus', { token })
      const rows = extractArray(data)
      setMenus(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Menuler alinamadi')
    }
  }

  const loadAllCategories = async () => {
    try {
      const data = await apiRequest<any>('/api/v1/categories', { token })
      setAllCategories(extractArray(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tum kategoriler alinamadi')
    }
  }

  const loadCategories = async (menuIdArg = selectedMenuId) => {
    try {
      const query = menuIdArg ? `?menuId=${encodeURIComponent(menuIdArg)}` : ''
      const data = await apiRequest<any>(`/api/v1/categories${query}`, { token })
      setCategories(extractArray(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategoriler alinamadi')
    }
  }

  const loadAllProducts = async () => {
    try {
      const data = await apiRequest<any>('/api/v1/products', { token })
      setAllProducts(extractArray(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tum urunler alinamadi')
    }
  }

  const loadProducts = async (categoryIdArg = selectedCategoryId) => {
    try {
      const query = categoryIdArg ? `?categoryId=${encodeURIComponent(categoryIdArg)}` : ''
      const data = await apiRequest<any>(`/api/v1/products${query}`, { token })
      setProducts(extractArray(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urunler alinamadi')
    }
  }

  const loadMenuCategories = async (menuIdArg: string) => {
    const data = await apiRequest<any>(`/api/v1/menus/${menuIdArg}/categories`, { token })
    return extractArray(data)
  }

  const loadCategoryProducts = async (categoryIdArg: string) => {
    const data = await apiRequest<any>(`/api/v1/products?categoryId=${encodeURIComponent(categoryIdArg)}`, { token })
    return extractArray(data)
  }

  const resolveMenusForCategory = async (categoryIdArg: string) => {
    const links: Array<{ id: string; title: string }> = []
    for (const menu of menus) {
      const menuIdArg = getEntityId(menu, '')
      if (!menuIdArg) continue
      const rows = await loadMenuCategories(menuIdArg)
      if (rows.some((category) => getEntityId(category, '') === categoryIdArg)) {
        links.push({ id: menuIdArg, title: String(getValue(menu, 'title') ?? menuIdArg) })
      }
    }
    return links
  }

  const resolveCategoriesForProduct = async (productIdArg: string) => {
    const links: Array<{ id: string; name: string }> = []
    for (const category of allCategories) {
      const categoryIdArg = getEntityId(category, '')
      if (!categoryIdArg) continue
      const rows = await loadCategoryProducts(categoryIdArg)
      if (rows.some((product) => getEntityId(product, '') === productIdArg)) {
        links.push({ id: categoryIdArg, name: String(getValue(category, 'name') ?? categoryIdArg) })
      }
    }
    return links
  }

  useEffect(() => {
    void Promise.all([loadMenus(), loadAllCategories(), loadCategories(''), loadAllProducts(), loadProducts('')])
  }, [])

  useEffect(() => {
    void loadCategories(selectedMenuId)
  }, [selectedMenuId])

  useEffect(() => {
    void loadProducts(selectedCategoryId)
  }, [selectedCategoryId])

  const openMenuCreate = () => {
    setMenuId('')
    setMenuTitle('')
    setMenuDescription('')
    setMenuImage('')
    setMenuActive(true)
    setMenuMode('create')
  }

  const openMenuEdit = (item: any) => {
    setMenuId(getEntityId(item, ''))
    setMenuTitle(String(getValue(item, 'title') ?? ''))
    setMenuDescription(String(getValue(item, 'description') ?? ''))
    setMenuImage(String(getValue(item, 'imageUrl') ?? ''))
    setMenuActive(Boolean(getValue(item, 'active')))
    setMenuMode('edit')
  }

  const saveMenu = async () => {
    resetStatus()
    const body: MenuPayload = { title: menuTitle, description: menuDescription, imageUrl: menuImage, active: menuActive }
    try {
      if (menuMode === 'create') {
        await apiRequest('/api/v1/menus', { method: 'POST', token, body })
        setStatus('Menu olusturuldu')
      } else {
        await apiRequest(`/api/v1/menus/${menuId}`, { method: 'PUT', token, body })
        setStatus('Menu guncellendi')
      }
      setMenuMode(null)
      await loadMenus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Menu kaydedilemedi')
    }
  }

  const deleteMenu = async (id: string) => {
    if (!window.confirm(`Menu silinsin mi? (${id})`)) return
    resetStatus()
    try {
      await apiRequest(`/api/v1/menus/${id}`, { method: 'DELETE', token })
      setStatus('Menu silindi')
      if (selectedMenuId === id) setSelectedMenuId('')
      await loadMenus()
      await loadCategories('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Menu silinemedi')
    }
  }

  const openCategoryCreate = () => {
    setCategoryId('')
    setCategoryName('')
    setCategoryOrder('0')
    setCategoryImage('')
    setCategoryMode('create')
  }

  const openCategoryEdit = (item: any) => {
    setCategoryId(getEntityId(item, ''))
    setCategoryName(String(getValue(item, 'name') ?? ''))
    setCategoryOrder(String(getValue(item, 'order') ?? 0))
    setCategoryImage(String(getValue(item, 'imageUrl') ?? ''))
    setCategoryMode('edit')
  }

  const saveCategory = async () => {
    resetStatus()
    const body: CategoryPayload = { name: categoryName, order: Number(categoryOrder) || 0, imageUrl: categoryImage }
    try {
      if (categoryMode === 'create') {
        await apiRequest('/api/v1/categories', { method: 'POST', token, body })
        setStatus('Kategori olusturuldu')
      } else {
        await apiRequest(`/api/v1/categories/${categoryId}`, { method: 'PUT', token, body })
        setStatus('Kategori guncellendi')
      }
      setCategoryMode(null)
      await loadAllCategories()
      await loadCategories(selectedMenuId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori kaydedilemedi')
    }
  }

  const deleteCategory = async (id: string) => {
    if (!window.confirm(`Kategori silinsin mi? (${id})`)) return
    resetStatus()
    try {
      await apiRequest(`/api/v1/categories/${id}`, { method: 'DELETE', token })
      setStatus('Kategori silindi')
      if (selectedCategoryId === id) setSelectedCategoryId('')
      await loadAllCategories()
      await loadCategories(selectedMenuId)
      await loadProducts(selectedCategoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori silinemedi')
    }
  }

  const openProductCreate = () => {
    setProductId('')
    setProductName('')
    setProductDescription('')
    setProductPrice('0')
    setProductDiscountedPrice('')
    setProductInStock(true)
    setProductImage('')
    setServingSize('')
    setCaloriesKcal('')
    setProteinG('')
    setCarbsG('')
    setFatG('')
    setSugarG('')
    setFiberG('')
    setSodiumMg('')
    setEnergyKj('')
    setAllergensText('')
    setProductMode('create')
  }

  const openProductEdit = (item: any) => {
    const nutrition = getObject(item, 'nutrition')
    const macros = getObject(nutrition, 'macros')
    const details = getObject(nutrition, 'details')
    const allergens = getValue(nutrition, 'allergens')
    setProductId(getEntityId(item, ''))
    const discounted = getValue(item, 'discountedPrice')
    setProductName(String(getValue(item, 'name') ?? ''))
    setProductDescription(String(getValue(item, 'description') ?? ''))
    setProductPrice(String(getValue(item, 'price') ?? 0))
    setProductDiscountedPrice(discounted !== null && discounted !== undefined ? String(discounted) : '')
    setProductInStock(Boolean(getValue(item, 'inStock')))
    setProductImage(String(getValue(item, 'imageUrl') ?? ''))
    setServingSize(String(getValue(nutrition, 'servingSize') ?? ''))
    setCaloriesKcal(String(getValue(nutrition, 'caloriesKcal') ?? ''))
    setProteinG(String(getValue(macros, 'proteinG') ?? ''))
    setCarbsG(String(getValue(macros, 'carbsG') ?? ''))
    setFatG(String(getValue(macros, 'fatG') ?? ''))
    setSugarG(String(getValue(details, 'sugarG') ?? ''))
    setFiberG(String(getValue(details, 'fiberG') ?? ''))
    setSodiumMg(String(getValue(details, 'sodiumMg') ?? ''))
    setEnergyKj(String(getValue(details, 'energyKj') ?? ''))
    setAllergensText(Array.isArray(allergens) ? allergens.join(', ') : '')
    setProductMode('edit')
  }

  const saveProduct = async () => {
    resetStatus()
    const allergens = allergensText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    const body: ProductPayload = {
      name: productName,
      description: productDescription,
      price: Number(productPrice) || 0,
      discountedPrice: productDiscountedPrice ? Number(productDiscountedPrice) : null,
      inStock: productInStock,
      imageUrl: productImage,
      nutrition: {
        servingSize: servingSize || null,
        caloriesKcal: caloriesKcal ? Number(caloriesKcal) : null,
        macros: {
          proteinG: proteinG ? Number(proteinG) : null,
          carbsG: carbsG ? Number(carbsG) : null,
          fatG: fatG ? Number(fatG) : null,
        },
        details: {
          sugarG: sugarG ? Number(sugarG) : null,
          fiberG: fiberG ? Number(fiberG) : null,
          sodiumMg: sodiumMg ? Number(sodiumMg) : null,
          energyKj: energyKj ? Number(energyKj) : null,
        },
        allergens,
      },
    }
    try {
      if (productMode === 'create') {
        await apiRequest('/api/v1/products', { method: 'POST', token, body })
        setStatus('Urun olusturuldu')
      } else {
        await apiRequest(`/api/v1/products/${productId}`, { method: 'PUT', token, body })
        setStatus('Urun guncellendi')
      }
      setProductMode(null)
      await loadAllProducts()
      await loadProducts(selectedCategoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun kaydedilemedi')
    }
  }

  const deleteProduct = async (id: string) => {
    if (!window.confirm(`Urun silinsin mi? (${id})`)) return
    resetStatus()
    try {
      await apiRequest(`/api/v1/products/${id}`, { method: 'DELETE', token })
      setStatus('Urun silindi')
      await loadAllProducts()
      await loadProducts(selectedCategoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun silinemedi')
    }
  }

  const openMenuCategoryMatch = async (menuItem: any) => {
    resetStatus()
    try {
      const id = getEntityId(menuItem, '')
      const linkedCategories = await loadMenuCategories(id)
      setMenuLinkState({
        id,
        title: String(getValue(menuItem, 'title') ?? id),
        targetCategoryId: '',
        linkedCategories,
        detailCategoryId: '',
        detailProducts: [],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Menu eslestirme acilamadi')
    }
  }

  const addCategoryToMenu = async () => {
    if (!menuLinkState?.id || !menuLinkState.targetCategoryId) {
      setError('Eklenecek kategori secilmelidir')
      return
    }
    resetStatus()
    try {
      await apiRequest(`/api/v1/menus/${menuLinkState.id}/category-links`, {
        method: 'POST',
        token,
        body: { categoryId: menuLinkState.targetCategoryId },
      })
      const linkedCategories = await loadMenuCategories(menuLinkState.id)
      setMenuLinkState((prev) => (prev ? { ...prev, linkedCategories, targetCategoryId: '' } : prev))
      setStatus('Kategori menuye baglandi')
      await loadCategories(selectedMenuId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori menuye baglanamadi')
    }
  }

  const removeCategoryFromMenuPanel = async (categoryIdArg: string) => {
    if (!menuLinkState) return
    resetStatus()
    try {
      await apiRequest(`/api/v1/menus/${menuLinkState.id}/category-links/${categoryIdArg}`, { method: 'DELETE', token })
      const linkedCategories = await loadMenuCategories(menuLinkState.id)
      setMenuLinkState((prev) => (prev ? { ...prev, linkedCategories } : prev))
      setStatus('Kategori-menu eslesmesi kaldirildi')
      await loadCategories(selectedMenuId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori-menu eslesmesi kaldirilamadi')
    }
  }

  const openCategoryDetailFromMenu = async (categoryIdArg: string) => {
    if (!menuLinkState) return
    resetStatus()
    try {
      const rows = await loadCategoryProducts(categoryIdArg)
      setMenuLinkState((prev) => (prev ? { ...prev, detailCategoryId: categoryIdArg, detailProducts: rows } : prev))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori urunleri alinamadi')
    }
  }

  const openCategoryMatch = async (item: any) => {
    resetStatus()
    try {
      const id = getEntityId(item, '')
      const [linkedMenus, linkedProducts] = await Promise.all([resolveMenusForCategory(id), loadCategoryProducts(id)])
      setLinkCategoryState({
        id,
        name: String(getValue(item, 'name') ?? id),
        tab: 'menu',
        targetMenuId: '',
        targetProductId: '',
        linkedMenus,
        linkedProducts,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori onboarding acilamadi')
    }
  }

  const linkCategoryToMenu = async () => {
    if (!linkCategoryState?.id || !linkCategoryState.targetMenuId) {
      setError('Kategori ve hedef menu secilmelidir')
      return
    }
    resetStatus()
    try {
      await apiRequest(`/api/v1/categories/${linkCategoryState.id}/menu-link`, {
        method: 'POST',
        token,
        body: { menuId: linkCategoryState.targetMenuId },
      })
      const linkedMenus = await resolveMenusForCategory(linkCategoryState.id)
      setLinkCategoryState((prev) => (prev ? { ...prev, linkedMenus, targetMenuId: '' } : prev))
      setStatus('Kategori menuye baglandi')
      await loadCategories(selectedMenuId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori menuye baglanamadi')
    }
  }

  const removeCategoryFromMenu = async (menuIdArg: string) => {
    if (!linkCategoryState) return
    resetStatus()
    try {
      await apiRequest(`/api/v1/menus/${menuIdArg}/category-links/${linkCategoryState.id}`, { method: 'DELETE', token })
      const linkedMenus = await resolveMenusForCategory(linkCategoryState.id)
      setLinkCategoryState((prev) => (prev ? { ...prev, linkedMenus } : prev))
      setStatus('Kategori-menu baglantisi kaldirildi')
      await loadCategories(selectedMenuId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori-menu baglantisi kaldirilamadi')
    }
  }

  const addProductToCategoryFromPool = async () => {
    if (!linkCategoryState?.id || !linkCategoryState.targetProductId) {
      setError('Eklenecek urun secilmelidir')
      return
    }
    resetStatus()
    try {
      await apiRequest(`/api/v1/categories/${linkCategoryState.id}/product-links`, {
        method: 'POST',
        token,
        body: { productId: linkCategoryState.targetProductId },
      })
      const linkedProducts = await loadCategoryProducts(linkCategoryState.id)
      setLinkCategoryState((prev) => (prev ? { ...prev, linkedProducts, targetProductId: '' } : prev))
      setStatus('Urun kategoriye baglandi')
      if (selectedCategoryId === linkCategoryState.id) await loadProducts(selectedCategoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun kategoriye baglanamadi')
    }
  }

  const removeLinkedProductFromCategory = async (linkedProductId: string) => {
    if (!linkCategoryState) return
    resetStatus()
    try {
      await apiRequest(`/api/v1/categories/${linkCategoryState.id}/product-links/${linkedProductId}`, { method: 'DELETE', token })
      const linkedProducts = await loadCategoryProducts(linkCategoryState.id)
      setLinkCategoryState((prev) => (prev ? { ...prev, linkedProducts } : prev))
      setStatus('Kategori-urun baglantisi kaldirildi')
      if (selectedCategoryId === linkCategoryState.id) await loadProducts(selectedCategoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategori-urun baglantisi kaldirilamadi')
    }
  }

  const openProductMatch = async (item: any) => {
    resetStatus()
    try {
      const id = getEntityId(item, '')
      const linkedCategories = await resolveCategoriesForProduct(id)
      setLinkProductState({
        id,
        name: String(getValue(item, 'name') ?? id),
        targetCategoryId: '',
        linkedCategories,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun eslestirme acilamadi')
    }
  }

  const linkProductToCategory = async () => {
    if (!linkProductState?.id || !linkProductState.targetCategoryId) {
      setError('Urun ve hedef kategori secilmelidir')
      return
    }
    resetStatus()
    try {
      await apiRequest(`/api/v1/products/${linkProductState.id}/category-link`, {
        method: 'POST',
        token,
        body: { categoryId: linkProductState.targetCategoryId },
      })
      const linkedCategories = await resolveCategoriesForProduct(linkProductState.id)
      setLinkProductState((prev) => (prev ? { ...prev, targetCategoryId: '', linkedCategories } : prev))
      setStatus('Urun kategoriye baglandi')
      if (selectedCategoryId) await loadProducts(selectedCategoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun kategoriye baglanamadi')
    }
  }

  const removeProductMatch = async (categoryIdArg: string) => {
    if (!linkProductState) return
    resetStatus()
    try {
      await apiRequest(`/api/v1/categories/${categoryIdArg}/product-links/${linkProductState.id}`, { method: 'DELETE', token })
      const linkedCategories = await resolveCategoriesForProduct(linkProductState.id)
      setLinkProductState((prev) => (prev ? { ...prev, linkedCategories } : prev))
      setStatus('Urun-kategori baglantisi kaldirildi')
      if (selectedCategoryId) await loadProducts(selectedCategoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun-kategori baglantisi kaldirilamadi')
    }
  }

  return (
    <section className="card stack">
      <div className="row between">
        <h2>Menu Yonetimi</h2>
        <div className="actions">
          <RefreshButton
            onClick={() => {
              void Promise.all([loadMenus(), loadAllCategories(), loadCategories(selectedMenuId), loadAllProducts(), loadProducts(selectedCategoryId)])
            }}
          />
          {tab === 'menu' && <IconAddButton onClick={openMenuCreate} label="Menu olustur" />}
          {tab === 'category' && <IconAddButton onClick={openCategoryCreate} label="Kategori olustur" />}
          {tab === 'product' && <IconAddButton onClick={openProductCreate} label="Urun olustur" />}
        </div>
      </div>

      <div className="row tab-switcher">
        <button className={tab === 'menu' ? 'active-tab' : ''} onClick={() => setTab('menu')}>
          Menu
        </button>
        <button className={tab === 'category' ? 'active-tab' : ''} onClick={() => setTab('category')}>
          Kategori
        </button>
        <button className={tab === 'product' ? 'active-tab' : ''} onClick={() => setTab('product')}>
          Urun
        </button>
      </div>
      <ToastStack error={error} success={status} onCloseError={() => setError('')} onCloseSuccess={() => setStatus('')} />

      {tab === 'menu' && (
        <table>
          <thead>
            <tr>
              <th>Baslik</th>
              <th>Gorsel</th>
              <th>Aktif</th>
              <th>Islem</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((item, idx) => {
              const id = getEntityId(item, String(idx))
              return (
                <tr key={id}>
                  <td>{String(getValue(item, 'title') ?? '-')}</td>
                  <td>{getValue(item, 'imageUrl') ? <img src={String(getValue(item, 'imageUrl'))} alt={String(getValue(item, 'title') ?? id)} className="thumb" /> : '-'}</td>
              <td>{String(Boolean(getValue(item, 'active')))}</td>
              <td className="actions">
                <button onClick={() => void openMenuCategoryMatch(item)}>Eslestir</button>
                <ActionIconButton kind="edit" title="Düzenle" onClick={() => openMenuEdit(item)} />
                <ActionIconButton kind="delete" title="Sil" onClick={() => void deleteMenu(id)} />
              </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {tab === 'category' && (
        <>
          <div className="row">
            <label>
              Menu Filtresi
              <select value={selectedMenuId} onChange={(e) => setSelectedMenuId(e.target.value)}>
                <option value="">Tum Kategoriler</option>
                {menus.map((m, idx) => {
                  const id = getEntityId(m, String(idx))
                  return (
                    <option key={id} value={id}>
                      {String(getValue(m, 'title') ?? id)}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Sira</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((item, idx) => {
                const id = getEntityId(item, String(idx))
                return (
                  <tr key={id}>
                    <td>{String(getValue(item, 'name') ?? '-')}</td>
                    <td>{String(getValue(item, 'order') ?? 0)}</td>
                    <td className="actions">
                      <ActionIconButton kind="edit" title="Düzenle" onClick={() => openCategoryEdit(item)} />
                      <button onClick={() => void openCategoryMatch(item)}>Eslestir</button>
                      <ActionIconButton kind="delete" title="Sil" onClick={() => void deleteCategory(id)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {tab === 'product' && (
        <>
          <div className="row">
            <label>
              Kategori Filtresi
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">Tum Urunler</option>
                {allCategories.map((category, idx) => {
                  const id = getEntityId(category, String(idx))
                  return (
                    <option key={id} value={id}>
                      {String(getValue(category, 'name') ?? id)}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Fiyat</th>
                <th>Stok</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, idx) => {
                const id = getEntityId(item, String(idx))
                return (
                  <tr key={id}>
                    <td>{String(getValue(item, 'name') ?? '-')}</td>
                    <td>{String(getValue(item, 'price') ?? 0)}</td>
                    <td>{String(Boolean(getValue(item, 'inStock')))}</td>
                    <td className="actions">
                      <ActionIconButton kind="edit" title="Düzenle" onClick={() => openProductEdit(item)} />
                      <button onClick={() => void openProductMatch(item)}>Eslestir</button>
                      <ActionIconButton kind="delete" title="Sil" onClick={() => void deleteProduct(id)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {menuMode && (
        <Modal title={menuMode === 'create' ? 'Menu Olustur' : `Menu Duzenle (${menuId})`} onClose={() => setMenuMode(null)}>
          <div className="grid-2">
            <label>
              Baslik
              <input value={menuTitle} onChange={(e) => setMenuTitle(e.target.value)} />
            </label>
            <label>
              Aciklama
              <input value={menuDescription} onChange={(e) => setMenuDescription(e.target.value)} />
            </label>
            <label>
              Gorsel Dosyasi
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    setError('')
                    setStatus('')
                    setIsUploadingMenuImage(true)
                    const uploadedImageUrl = await uploadImage(file, token)
                    setMenuImage(uploadedImageUrl)
                    setStatus('Menu gorseli yuklendi')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Dosya yuklenemedi')
                  } finally {
                    setIsUploadingMenuImage(false)
                  }
                }}
              />
              <small className="muted">{isUploadingMenuImage ? 'Gorsel yukleniyor...' : 'Secilen gorsel otomatik olarak URL\'ye cevrilir.'}</small>
            </label>
            <div className="toggle-row">
              <label className="checkbox setting-toggle">
                Aktif
                <input type="checkbox" checked={menuActive} onChange={(e) => setMenuActive(e.target.checked)} />
              </label>
            </div>
          </div>
          {menuImage && <img className="thumb lg" src={menuImage} alt="Menu gorseli" />}
          <div className="actions">
            <button className="primary-btn" onClick={() => void saveMenu()} disabled={isUploadingMenuImage}>
              {isUploadingMenuImage ? 'Yukleniyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}

      {categoryMode && (
        <Modal title={categoryMode === 'create' ? 'Kategori Olustur' : `Kategori Duzenle (${categoryId})`} onClose={() => setCategoryMode(null)}>
          <div className="grid-2">
            <label>
              Ad
              <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </label>
            <label>
              Sira
              <input value={categoryOrder} inputMode="numeric" onChange={(e) => setCategoryOrder(sanitizeIntegerInput(e.target.value))} />
            </label>
            <label>
              Gorsel Dosyasi
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    setError('')
                    setStatus('')
                    setIsUploadingCategoryImage(true)
                    const uploadedImageUrl = await uploadImage(file, token)
                    setCategoryImage(uploadedImageUrl)
                    setStatus('Kategori gorseli yuklendi')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Dosya yuklenemedi')
                  } finally {
                    setIsUploadingCategoryImage(false)
                  }
                }}
              />
              <small className="muted">
                {isUploadingCategoryImage ? 'Gorsel yukleniyor...' : 'Secilen gorsel otomatik olarak URL\'ye cevrilir.'}
              </small>
            </label>
          </div>
          {categoryImage && <img className="thumb lg" src={categoryImage} alt="Kategori gorseli" />}
          <div className="actions">
            <button className="primary-btn" onClick={() => void saveCategory()} disabled={isUploadingCategoryImage}>
              {isUploadingCategoryImage ? 'Yukleniyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}

      {productMode && (
        <Modal title={productMode === 'create' ? 'Urun Olustur' : `Urun Duzenle (${productId})`} onClose={() => setProductMode(null)}>
          <div className="grid-2">
            <label>
              Ad
              <input value={productName} onChange={(e) => setProductName(e.target.value)} />
            </label>
            <label>
              Aciklama
              <input value={productDescription} onChange={(e) => setProductDescription(e.target.value)} />
            </label>
            <label>
              Fiyat
              <input value={productPrice} inputMode="decimal" onChange={(e) => setProductPrice(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Indirimli Fiyat
              <input
                value={productDiscountedPrice}
                inputMode="decimal"
                onChange={(e) => setProductDiscountedPrice(sanitizeDecimalInput(e.target.value))}
              />
            </label>
            <label>
              Gorsel Dosyasi
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    setError('')
                    setStatus('')
                    setIsUploadingProductImage(true)
                    const uploadedImageUrl = await uploadImage(file, token)
                    setProductImage(uploadedImageUrl)
                    setStatus('Urun gorseli yuklendi')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Dosya yuklenemedi')
                  } finally {
                    setIsUploadingProductImage(false)
                  }
                }}
              />
              <small className="muted">{isUploadingProductImage ? 'Gorsel yukleniyor...' : 'Secilen gorsel otomatik olarak URL\'ye cevrilir.'}</small>
            </label>
            <div className="toggle-row">
              <label className="checkbox setting-toggle">
                Stokta
                <input type="checkbox" checked={productInStock} onChange={(e) => setProductInStock(e.target.checked)} />
              </label>
            </div>
          </div>
          {productImage && <img className="thumb lg" src={productImage} alt="Urun gorseli" />}
          <div className="grid-3">
            <label>
              Porsiyon
              <input value={servingSize} onChange={(e) => setServingSize(e.target.value)} />
            </label>
            <label>
              Kalori (kcal)
              <input value={caloriesKcal} inputMode="decimal" onChange={(e) => setCaloriesKcal(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Protein (g)
              <input value={proteinG} inputMode="decimal" onChange={(e) => setProteinG(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Karbonhidrat (g)
              <input value={carbsG} inputMode="decimal" onChange={(e) => setCarbsG(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Yag (g)
              <input value={fatG} inputMode="decimal" onChange={(e) => setFatG(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Seker (g)
              <input value={sugarG} inputMode="decimal" onChange={(e) => setSugarG(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Lif (g)
              <input value={fiberG} inputMode="decimal" onChange={(e) => setFiberG(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Sodyum (mg)
              <input value={sodiumMg} inputMode="decimal" onChange={(e) => setSodiumMg(sanitizeDecimalInput(e.target.value))} />
            </label>
            <label>
              Enerji (kj)
              <input value={energyKj} inputMode="decimal" onChange={(e) => setEnergyKj(sanitizeDecimalInput(e.target.value))} />
            </label>
          </div>
          <label>
            Alerjenler (virgulle ayir)
            <input value={allergensText} onChange={(e) => setAllergensText(e.target.value)} />
          </label>
          <div className="actions">
            <button className="primary-btn" onClick={() => void saveProduct()} disabled={isUploadingProductImage}>
              {isUploadingProductImage ? 'Yukleniyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}

      {menuLinkState && (
        <Modal title={`Menu-Kategori Eslestirme: ${menuLinkState.title}`} onClose={() => setMenuLinkState(null)}>
          <div className="match-panel">
            <div className="match-col">
              <h4>Menuye Bagli Kategoriler</h4>
              <div className="match-list">
                {menuLinkState.linkedCategories.map((category, idx) => {
                  const categoryIdArg = getEntityId(category, String(idx))
                  return (
                    <div key={categoryIdArg} className="match-item">
                      <div>
                        <strong>{String(getValue(category, 'name') ?? categoryIdArg)}</strong>
                      </div>
                      <div className="actions">
                        <button onClick={() => void openCategoryDetailFromMenu(categoryIdArg)}>Detay</button>
                        <ActionIconButton kind="delete" title="Kaldır" onClick={() => void removeCategoryFromMenuPanel(categoryIdArg)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="match-col">
              <h4>Menuye Kategori Ekle</h4>
              <label>
                Kategori Secimi
                <select
                  value={menuLinkState.targetCategoryId}
                  onChange={(e) => setMenuLinkState((prev) => (prev ? { ...prev, targetCategoryId: e.target.value } : prev))}
                >
                  <option value="">Seciniz</option>
                  {allCategories
                    .filter(
                      (category) =>
                        !menuLinkState.linkedCategories.some((linked) => getEntityId(linked, '') === getEntityId(category, '')),
                    )
                    .map((category, idx) => {
                      const id = getEntityId(category, String(idx))
                      return (
                        <option key={id} value={id}>
                          {String(getValue(category, 'name') ?? id)}
                        </option>
                      )
                    })}
                </select>
              </label>
              <button className="primary-btn" onClick={() => void addCategoryToMenu()}>
                Kategori Ekle
              </button>
            </div>
          </div>

          {menuLinkState.detailCategoryId && (
            <div className="match-detail">
              <h4>Kategori Detayi - Urunler</h4>
              <table>
                <thead>
                  <tr>
                    <th>Urun</th>
                    <th>Fiyat</th>
                    <th>Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {menuLinkState.detailProducts.map((product, idx) => {
                    const productIdArg = getEntityId(product, String(idx))
                    return (
                      <tr key={productIdArg}>
                        <td>{String(getValue(product, 'name') ?? '-')}</td>
                        <td>{String(getValue(product, 'price') ?? 0)}</td>
                        <td>{String(Boolean(getValue(product, 'inStock')))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {linkCategoryState && (
        <Modal title={`Kategori Eslestirme Onboarding: ${linkCategoryState.name}`} onClose={() => setLinkCategoryState(null)}>
          <div className="row tab-switcher">
            <button
              className={linkCategoryState.tab === 'menu' ? 'active-tab' : ''}
              onClick={() => setLinkCategoryState((prev) => (prev ? { ...prev, tab: 'menu' } : prev))}
            >
              Menu Eslestirmeleri
            </button>
            <button
              className={linkCategoryState.tab === 'product' ? 'active-tab' : ''}
              onClick={() => setLinkCategoryState((prev) => (prev ? { ...prev, tab: 'product' } : prev))}
            >
              Urun Eslestirmeleri
            </button>
          </div>

          {linkCategoryState.tab === 'menu' && (
            <div className="match-panel">
              <div className="match-col">
                <h4>Bagli Menuler</h4>
                <div className="match-list">
                  {linkCategoryState.linkedMenus.map((menu) => (
                    <div key={menu.id} className="match-item">
                      <div>
                        <strong>{menu.title}</strong>
                      </div>
                      <ActionIconButton kind="delete" title="Kaldır" onClick={() => void removeCategoryFromMenu(menu.id)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="match-col">
                <h4>Menuye Ekle</h4>
                <label>
                  Hedef Menu
                  <select
                    value={linkCategoryState.targetMenuId}
                    onChange={(e) => setLinkCategoryState((prev) => (prev ? { ...prev, targetMenuId: e.target.value } : prev))}
                  >
                    <option value="">Seciniz</option>
                    {menus
                      .filter((menu) => !linkCategoryState.linkedMenus.some((linkedMenu) => linkedMenu.id === getEntityId(menu, '')))
                      .map((menu, idx) => {
                        const id = getEntityId(menu, String(idx))
                        return (
                          <option key={id} value={id}>
                            {String(getValue(menu, 'title') ?? id)}
                          </option>
                        )
                      })}
                  </select>
                </label>
                <button className="primary-btn" onClick={() => void linkCategoryToMenu()}>
                  Ekle
                </button>
              </div>
            </div>
          )}

          {linkCategoryState.tab === 'product' && (
            <div className="match-panel">
              <div className="match-col">
                <h4>Kategoriye Bagli Urunler</h4>
                <div className="match-list">
                  {linkCategoryState.linkedProducts.map((product, idx) => {
                    const linkedProductId = getEntityId(product, String(idx))
                    return (
                      <div key={linkedProductId} className="match-item">
                        <div>
                          <strong>{String(getValue(product, 'name') ?? linkedProductId)}</strong>
                        </div>
                        <ActionIconButton kind="delete" title="Kaldır" onClick={() => void removeLinkedProductFromCategory(linkedProductId)} />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="match-col">
                <h4>Kategoriye Urun Ekle</h4>
                <label>
                  Urun Secimi
                  <select
                    value={linkCategoryState.targetProductId}
                    onChange={(e) => setLinkCategoryState((prev) => (prev ? { ...prev, targetProductId: e.target.value } : prev))}
                  >
                    <option value="">Seciniz</option>
                    {allProducts
                      .filter(
                        (product) =>
                          !linkCategoryState.linkedProducts.some((linkedProduct) => getEntityId(linkedProduct, '') === getEntityId(product, '')),
                      )
                      .map((product, idx) => {
                        const id = getEntityId(product, String(idx))
                        return (
                          <option key={id} value={id}>
                            {String(getValue(product, 'name') ?? id)}
                          </option>
                        )
                      })}
                  </select>
                </label>
                <button className="primary-btn" onClick={() => void addProductToCategoryFromPool()}>
                  Ekle
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {linkProductState && (
        <Modal title={`Urun - Kategori Eslestirme: ${linkProductState.name}`} onClose={() => setLinkProductState(null)}>
          <div className="match-panel">
            <div className="match-col">
              <h4>Eslesmis Kategoriler</h4>
              <div className="match-list">
                {linkProductState.linkedCategories.map((category) => (
                  <div key={category.id} className="match-item">
                    <div>
                      <strong>{category.name}</strong>
                    </div>
                    <ActionIconButton kind="delete" title="Kaldır" onClick={() => void removeProductMatch(category.id)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="match-col">
              <h4>Kategori Ekle</h4>
              <label>
                Hedef Kategori
                <select
                  value={linkProductState.targetCategoryId}
                  onChange={(e) => setLinkProductState((prev) => (prev ? { ...prev, targetCategoryId: e.target.value } : prev))}
                >
                  <option value="">Seciniz</option>
                  {allCategories
                    .filter((category) => !linkProductState.linkedCategories.some((linked) => linked.id === getEntityId(category, '')))
                    .map((category, idx) => {
                      const id = getEntityId(category, String(idx))
                      return (
                        <option key={id} value={id}>
                          {String(getValue(category, 'name') ?? id)}
                        </option>
                      )
                    })}
                </select>
              </label>
              <button className="primary-btn" onClick={() => void linkProductToCategory()}>
                Ekle
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

function ContentManagementPage({ token }: { token: string }) {
  const [sections, setSections] = useState<Record<PageSectionKey, PageSectionPayload>>(() => createInitialPageSections())
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const [editingKey, setEditingKey] = useState<PageSectionKey | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const activeConfig = editingKey ? PAGE_SECTION_CONFIG.find((item) => item.key === editingKey) ?? null : null

  const loadSections = async (showSuccess = false) => {
    setError('')
    if (showSuccess) setStatus('')

    try {
      const pairs = await Promise.all(
        PAGE_SECTION_CONFIG.map(async (item) => {
          try {
            const response = await apiRequest<any>(`/api/v1/page-sections/${item.key}`, { token })
            return [item.key, normalizePageSection(response)] as const
          } catch (e) {
            const apiError = e as ApiError
            if (apiError.status === 404) {
              return [item.key, createEmptyPageSection()] as const
            }
            throw new Error(`${item.label}: ${e instanceof Error ? e.message : 'Icerik alinamadi'}`)
          }
        }),
      )

      const next = createInitialPageSections()
      pairs.forEach(([key, value]) => {
        next[key] = value
      })
      setSections(next)
      if (showSuccess) setStatus('Icerik kartlari guncellendi')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Icerikler alinamadi')
    }
  }

  useEffect(() => {
    void loadSections(false)
  }, [token])

  const openEdit = (key: PageSectionKey) => {
    const section = sections[key]
    setTitle(section.title)
    setDescription(section.description)
    setImageUrl(section.imageUrl)
    setTagsText(section.tags.join(', '))
    setEditingKey(key)
  }

  const saveSection = async () => {
    if (!editingKey || !activeConfig) return
    if (isUploadingImage) {
      setError('Gorsel yukleme suruyor, lutfen bekleyin')
      return
    }
    setError('')
    setStatus('')

    const targetKey = editingKey
    const payload: PageSectionPayload = {
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      tags: parseTagsInput(tagsText),
    }

    try {
      const response = await apiRequest<any>(`/api/v1/page-sections/${targetKey}`, {
        method: 'PUT',
        token,
        body: payload,
      })
      const normalized = normalizePageSection(extractObject(response) ?? payload)
      setSections((prev) => ({ ...prev, [targetKey]: normalized }))
      setStatus(`${activeConfig.label} icerigi guncellendi`)
      setEditingKey(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Icerik kaydedilemedi')
    }
  }

  return (
    <section className="stack">
      <div className="card">
        <div className="row between">
          <h2>İçerik Yönetimi</h2>
          <div className="actions">
            <RefreshButton onClick={() => void loadSections(true)} />
          </div>
        </div>
        <p className="muted">Ana sayfa, menu, şube ve iletişim alanlarını 4 kart üstünden düzenleyebilirsiniz.</p>
        <ToastStack error={error} success={status} onCloseError={() => setError('')} onCloseSuccess={() => setStatus('')} />

        <div className="content-section-grid">
          {PAGE_SECTION_CONFIG.map((item) => {
            const section = sections[item.key]
            return (
              <article key={item.key} className="content-section-card">
                <div className="content-section-head">
                  <div>
                    <h3>{item.label}</h3>
                    <p>{item.helper}</p>
                  </div>
                  <ActionIconButton kind="edit" title="Düzenle" onClick={() => openEdit(item.key)} />
                </div>

                <div className="content-section-preview">
                  {section.imageUrl ? (
                    <img className="content-section-image" src={section.imageUrl} alt={`${item.label} onizleme gorseli`} />
                  ) : (
                    <div className="content-section-image placeholder">Gorsel yok</div>
                  )}
                  <div className="content-section-meta">
                    <h4>{section.title || `${item.label} basligi`}</h4>
                    <p>{section.description || 'Bu kart icin aciklama henuz girilmedi.'}</p>
                    <div className="content-section-tags">
                      {section.tags.length ? (
                        section.tags.map((tag, idx) => (
                          <span key={`${item.key}-${tag}-${idx}`} className="tag-chip">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="tag-chip empty">Etiket yok</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {editingKey && activeConfig && (
        <Modal title={`${activeConfig.label} Icerigi Duzenle`} onClose={() => setEditingKey(null)}>
          <div className="grid-2">
            <label>
              Baslik
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Etiketler (virgulle ayir)
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="kampanya, brunch, kokteyl" />
            </label>
            <label>
              Gorsel Dosyasi
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    setError('')
                    setStatus('')
                    setIsUploadingImage(true)
                    const uploadedImageUrl = await uploadImage(file, token)
                    setImageUrl(uploadedImageUrl)
                    setStatus('Gorsel yuklendi')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Dosya yuklenemedi')
                  } finally {
                    setIsUploadingImage(false)
                  }
                }}
              />
              <small className="muted">{isUploadingImage ? 'Gorsel yukleniyor...' : 'Secilen gorsel otomatik olarak URL\'ye cevrilir.'}</small>
            </label>
          </div>
          <label>
            Aciklama
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="section-modal-preview">
            {imageUrl ? <img className="content-section-image" src={imageUrl} alt="Guncel onizleme gorseli" /> : <p className="muted">Gorsel secilmedi</p>}
          </div>
          <div className="actions">
            <button className="primary-btn" onClick={() => void saveSection()} disabled={isUploadingImage}>
              {isUploadingImage ? 'Yukleniyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function UsersPage({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([])

  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)

  const [id, setId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>(USER_ROLE_OPTIONS[0])

  const tryLoadUsers = async (showSuccess = false) => {
    setError('')
    if (showSuccess) setStatus('')
    try {
      const data = await apiRequest<any>('/api/v1/users', { token })
      const rows = extractArray(data)
      setItems(rows)
      if (showSuccess) setStatus('Kullanicilar guncellendi')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kullanici listesi alinamadi')
    }
  }

  useEffect(() => {
    void tryLoadUsers(false)
  }, [])

  const openCreate = () => {
    setId('')
    setUsername('')
    setPassword('')
    setRole(USER_ROLE_OPTIONS[0])
    setMode('create')
  }

  const openEdit = (item: any) => {
    setId(getEntityId(item, ''))
    setUsername(String(getValue(item, 'username') ?? ''))
    setPassword('')
    const incomingRole = String(getValue(item, 'role') ?? USER_ROLE_OPTIONS[0])
    const normalizedRole = USER_ROLE_OPTIONS.includes(incomingRole as (typeof USER_ROLE_OPTIONS)[number])
      ? incomingRole
      : USER_ROLE_OPTIONS[0]
    setRole(normalizedRole)
    setMode('edit')
  }

  const save = async () => {
    setError('')
    setStatus('')
    try {
      const body: UserPayload = { username, password, role }
      if (mode === 'create') {
        await apiRequest<any>('/api/v1/users', { method: 'POST', token, body })
        setStatus('Kullanici olusturuldu')
      } else {
        if (!id) {
          setError('ID gerekli')
          return
        }
        await apiRequest(`/api/v1/users/${id}`, { method: 'PUT', token, body })
        setStatus('Kullanici guncellendi')
      }
      await tryLoadUsers(true)
      setMode(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kullanici kaydedilemedi')
    }
  }

  const remove = async (userId: string) => {
    if (!window.confirm(`Kullanici silinsin mi? (${userId})`)) return
    setError('')
    setStatus('')
    try {
      await apiRequest(`/api/v1/users/${userId}`, { method: 'DELETE', token })
      setStatus('Kullanici silindi')
      await tryLoadUsers(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kullanici silinemedi')
    }
  }

  return (
    <section className="card">
      <div className="row between">
        <h2>Kullanicilar</h2>
        <div className="actions">
          <RefreshButton onClick={() => void tryLoadUsers(true)} />
          <IconAddButton onClick={openCreate} label="Kullanici olustur" />
        </div>
      </div>
      <ToastStack error={error} success={status} onCloseError={() => setError('')} onCloseSuccess={() => setStatus('')} />

      <table>
        <thead>
          <tr>
            <th>Kullanici Adi</th>
            <th>Rol</th>
            <th>Islem</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u, idx) => {
            const uid = getEntityId(u, String(idx))
            return (
              <tr key={uid}>
                <td>{String(getValue(u, 'username') ?? '-')}</td>
                <td>{String(getValue(u, 'role') ?? '-')}</td>
                <td className="actions">
                  <ActionIconButton kind="edit" title="Düzenle" onClick={() => openEdit(u)} />
                  <ActionIconButton kind="delete" title="Sil" onClick={() => void remove(uid)} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {mode && (
        <Modal title={mode === 'create' ? 'Kullanici Olustur' : `Kullanici Duzenle (${id})`} onClose={() => setMode(null)}>
          <div className="grid-2">
            <label>
              Kullanici Adi
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label>
              Sifre
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label>
              Rol
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {USER_ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="primary-btn" onClick={() => void save()}>Kaydet</button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function CompanyPage({ token }: { token: string }) {
  const [contact, setContact] = useState<ContactPayload | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [socialHasValue, setSocialHasValue] = useState(false)
  const [instagram, setInstagram] = useState('')
  const [x, setX] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [facebook, setFacebook] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [orderHasValue, setOrderHasValue] = useState(false)
  const [yemeksepeti, setYemeksepeti] = useState('')
  const [getir, setGetir] = useState('')
  const [trendyolYemek, setTrendyolYemek] = useState('')

  const loadContact = async () => {
    setError('')
    try {
      const data = await apiRequest<any>('/api/v1/contact/info', { token })
      const obj = extractObject(data)
      if (obj) {
        setContact(obj as ContactPayload)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Iletisim bilgisi alinamadi')
    }
  }

  const loadRequests = async () => {
    setError('')
    try {
      const data = await apiRequest<any>('/api/v1/contact/requests', { token })
      setRequests(extractArray(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mesajlar alinamadi')
    }
  }

  useEffect(() => {
    void loadContact()
    void loadRequests()
  }, [])

  const openModal = (edit: boolean) => {
    const c = contact
    const social = getObject(c, 'social')
    const orderLinks = getObject(c, 'orderLinks')
    setPhone(String(getValue(c, 'phone') ?? ''))
    setEmail(String(getValue(c, 'email') ?? ''))
    setSocialHasValue(Boolean(getValue(social, 'hasValue')))
    setInstagram(String(getValue(social, 'instagram') ?? ''))
    setX(String(getValue(social, 'x') ?? ''))
    setTiktok(String(getValue(social, 'tiktok') ?? ''))
    setFacebook(String(getValue(social, 'facebook') ?? ''))
    setWhatsapp(String(getValue(social, 'whatsapp') ?? ''))
    setOrderHasValue(Boolean(getValue(orderLinks, 'hasValue')))
    setYemeksepeti(String(getValue(orderLinks, 'yemeksepeti') ?? ''))
    setGetir(String(getValue(orderLinks, 'getir') ?? ''))
    setTrendyolYemek(String(getValue(orderLinks, 'trendyolYemek') ?? ''))
    setMode(edit ? 'edit' : 'create')
  }

  const save = async () => {
    setError('')
    setStatus('')
    const body: ContactPayload = {
      phone,
      email,
      social: {
        hasValue: socialHasValue,
        instagram,
        x,
        tiktok,
        facebook,
        whatsapp,
      },
      orderLinks: {
        hasValue: orderHasValue,
        yemeksepeti,
        getir,
        trendyolYemek,
      },
    }

    try {
      await apiRequest('/api/v1/contact/info', {
        method: mode === 'create' ? 'POST' : 'PUT',
        token,
        body,
      })
      setStatus(mode === 'create' ? 'Firma bilgisi olusturuldu' : 'Firma bilgisi guncellendi')
      setMode(null)
      await loadContact()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydetme basarisiz')
    }
  }

  return (
    <section className="stack">
      <div className="card">
        <div className="row between">
          <h2>Firma Bilgileri</h2>
          <div className="actions">
            <RefreshButton
              onClick={() => {
                void loadContact()
                void loadRequests()
              }}
            />
            <IconAddButton onClick={() => openModal(!contact)} label="Iletisim bilgisi olustur/guncelle" />
            {contact && <ActionIconButton kind="edit" title="Düzenle" onClick={() => openModal(true)} />}
          </div>
        </div>
        <ToastStack error={error} success={status} onCloseError={() => setError('')} onCloseSuccess={() => setStatus('')} />

        <table className="kv-table">
          <tbody>
            <tr>
              <th>Telefon</th>
              <td>{String(getValue(contact, 'phone') ?? '-')}</td>
            </tr>
            <tr>
              <th>E-posta</th>
              <td>{String(getValue(contact, 'email') ?? '-')}</td>
            </tr>
            <tr>
              <th>Instagram</th>
              <td>{String(getValue(getObject(contact, 'social'), 'instagram') ?? '-')}</td>
            </tr>
            <tr>
              <th>X</th>
              <td>{String(getValue(getObject(contact, 'social'), 'x') ?? '-')}</td>
            </tr>
            <tr>
              <th>Tiktok</th>
              <td>{String(getValue(getObject(contact, 'social'), 'tiktok') ?? '-')}</td>
            </tr>
            <tr>
              <th>Facebook</th>
              <td>{String(getValue(getObject(contact, 'social'), 'facebook') ?? '-')}</td>
            </tr>
            <tr>
              <th>WhatsApp</th>
              <td>{String(getValue(getObject(contact, 'social'), 'whatsapp') ?? '-')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Gelen Iletisim Mesajlari</h3>
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Iletisim</th>
              <th>Tur</th>
              <th>Mesaj</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, idx) => {
              const id = getEntityId(req, String(idx))
              return (
                <tr key={id}>
                  <td>{String(getValue(req, 'fullName') ?? '-')}</td>
                  <td>{String(getValue(req, 'phoneOrEmail') ?? '-')}</td>
                  <td>{getContactRequestTypeLabel(getValue(req, 'type'))}</td>
                  <td>{String(getValue(req, 'message') ?? '-')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {mode && (
        <Modal title={mode === 'create' ? 'Firma Bilgisi Olustur' : 'Firma Bilgisi Duzenle'} onClose={() => setMode(null)}>
          <div className="grid-2">
            <label>
              Telefon
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              E-posta
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div className="toggle-row">
              <label className="checkbox setting-toggle">
                Sosyal Linkler Aktif
                <input type="checkbox" checked={socialHasValue} onChange={(e) => setSocialHasValue(e.target.checked)} />
              </label>
            </div>
            <div className="toggle-row">
              <label className="checkbox setting-toggle">
                Siparis Linkleri Aktif
                <input type="checkbox" checked={orderHasValue} onChange={(e) => setOrderHasValue(e.target.checked)} />
              </label>
            </div>
            <label>
              Instagram
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </label>
            <label>
              X
              <input value={x} onChange={(e) => setX(e.target.value)} />
            </label>
            <label>
              Tiktok
              <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
            </label>
            <label>
              Facebook
              <input value={facebook} onChange={(e) => setFacebook(e.target.value)} />
            </label>
            <label>
              WhatsApp
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </label>
            <label>
              Yemeksepeti
              <input value={yemeksepeti} onChange={(e) => setYemeksepeti(e.target.value)} />
            </label>
            <label>
              Getir
              <input value={getir} onChange={(e) => setGetir(e.target.value)} />
            </label>
            <label>
              Trendyol Yemek
              <input value={trendyolYemek} onChange={(e) => setTrendyolYemek(e.target.value)} />
            </label>
          </div>
          <div className="actions">
            <button className="primary-btn" onClick={() => void save()}>Kaydet</button>
          </div>
        </Modal>
      )}
    </section>
  )
}

export default App
