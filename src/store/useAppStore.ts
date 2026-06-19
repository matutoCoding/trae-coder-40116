import { create } from 'zustand'
import type {
  Player,
  Script,
  DM,
  GameSession,
  Willingness,
  DiscountCoupon,
  Bill,
  DMSchedule,
  DiscountOrderConfig,
  DiscountType
} from '../types'
import {
  mockPlayers,
  mockScripts,
  mockDMs,
  mockGameSessions,
  mockCoupons,
  generateMockDMSchedules
} from '../data/mockData'
import { DEFAULT_DISCOUNT_ORDER } from '../modules/discount'

const STORAGE_KEY = 'script-kill-app-data'

interface PersistedState {
  players: Player[]
  scripts: Script[]
  dms: DM[]
  gameSessions: GameSession[]
  willingnessList: Willingness[]
  coupons: DiscountCoupon[]
  bills: Bill[]
  dmSchedules: DMSchedule[]
  discountOrder: DiscountOrderConfig
  initialized: boolean
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed.initialized) return parsed
    }
  } catch { /* ignore */ }
  return null
}

function persistState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, initialized: true }))
  } catch { /* ignore */ }
}

function getDefaultState(): PersistedState {
  return {
    players: mockPlayers,
    scripts: mockScripts,
    dms: mockDMs,
    gameSessions: mockGameSessions,
    willingnessList: [],
    coupons: mockCoupons,
    bills: [],
    dmSchedules: generateMockDMSchedules(),
    discountOrder: { order: DEFAULT_DISCOUNT_ORDER },
    initialized: true
  }
}

const persisted = loadPersistedState()
const initialState = persisted ?? getDefaultState()

interface AppState extends PersistedState {
  selectedGameId: string | null

  setSelectedGameId: (id: string | null) => void
  addPlayer: (player: Player) => void
  addScript: (script: Script) => void
  addGameSession: (game: GameSession) => void
  updateGameSession: (game: GameSession) => void
  removeGameSession: (id: string) => void

  addWillingness: (willingness: Willingness) => void
  updateWillingness: (willingness: Willingness) => void
  batchUpdateWillingness: (willingnesses: Willingness[]) => void

  addBill: (bill: Bill) => void
  addBills: (bills: Bill[]) => void
  updateBill: (bill: Bill) => void
  removeBillsByGame: (gameId: string) => void

  addDMSchedule: (schedule: DMSchedule) => void
  updateDMSchedule: (schedule: DMSchedule) => void
  batchUpdateDMSchedules: (schedules: DMSchedule[]) => void

  updateDiscountOrder: (order: DiscountType[]) => void
  resetData: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  selectedGameId: null,

  setSelectedGameId: (id) => set({ selectedGameId: id }),

  addPlayer: (player) =>
    set((state) => {
      const next = { players: [...state.players, player] }
      persistState({ ...state, ...next })
      return next
    }),

  addScript: (script) =>
    set((state) => {
      const next = { scripts: [...state.scripts, script] }
      persistState({ ...state, ...next })
      return next
    }),

  addGameSession: (game) =>
    set((state) => {
      const next = { gameSessions: [...state.gameSessions, game] }
      persistState({ ...state, ...next })
      return next
    }),

  updateGameSession: (game) =>
    set((state) => {
      const next = {
        gameSessions: state.gameSessions.map((g) =>
          g.id === game.id ? game : g
        )
      }
      persistState({ ...state, ...next })
      return next
    }),

  removeGameSession: (id) =>
    set((state) => {
      const next = {
        gameSessions: state.gameSessions.filter((g) => g.id !== id)
      }
      persistState({ ...state, ...next })
      return next
    }),

  addWillingness: (willingness) =>
    set((state) => {
      const next = { willingnessList: [...state.willingnessList, willingness] }
      persistState({ ...state, ...next })
      return next
    }),

  updateWillingness: (willingness) =>
    set((state) => {
      const next = {
        willingnessList: state.willingnessList.map((w) =>
          w.id === willingness.id ? willingness : w
        )
      }
      persistState({ ...state, ...next })
      return next
    }),

  batchUpdateWillingness: (willingnesses) =>
    set((state) => {
      const map = new Map(state.willingnessList.map((w) => [w.id, w]))
      willingnesses.forEach((w) => map.set(w.id, w))
      const next = { willingnessList: Array.from(map.values()) }
      persistState({ ...state, ...next })
      return next
    }),

  addBill: (bill) =>
    set((state) => {
      const next = { bills: [...state.bills, bill] }
      persistState({ ...state, ...next })
      return next
    }),

  addBills: (newBills) =>
    set((state) => {
      const next = { bills: [...state.bills, ...newBills] }
      persistState({ ...state, ...next })
      return next
    }),

  updateBill: (bill) =>
    set((state) => {
      const next = {
        bills: state.bills.map((b) => (b.id === bill.id ? bill : b))
      }
      persistState({ ...state, ...next })
      return next
    }),

  removeBillsByGame: (gameId) =>
    set((state) => {
      const next = {
        bills: state.bills.filter(
          (b) => !(b.gameId === gameId && b.paymentStatus === '待支付')
        )
      }
      persistState({ ...state, ...next })
      return next
    }),

  addDMSchedule: (schedule) =>
    set((state) => {
      const next = { dmSchedules: [...state.dmSchedules, schedule] }
      persistState({ ...state, ...next })
      return next
    }),

  updateDMSchedule: (schedule) =>
    set((state) => {
      const next = {
        dmSchedules: state.dmSchedules.map((s) =>
          s.id === schedule.id ? schedule : s
        )
      }
      persistState({ ...state, ...next })
      return next
    }),

  batchUpdateDMSchedules: (schedules) =>
    set((state) => {
      const map = new Map(state.dmSchedules.map((s) => [s.id, s]))
      schedules.forEach((s) => map.set(s.id, s))
      const next = { dmSchedules: Array.from(map.values()) }
      persistState({ ...state, ...next })
      return next
    }),

  updateDiscountOrder: (order) =>
    set((state) => {
      const next = { discountOrder: { order } }
      persistState({ ...state, ...next })
      return next
    }),

  resetData: () => {
    const def = getDefaultState()
    persistState(def)
    set(def)
  }
}))
