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

interface AppState {
  players: Player[]
  scripts: Script[]
  dms: DM[]
  gameSessions: GameSession[]
  willingnessList: Willingness[]
  coupons: DiscountCoupon[]
  bills: Bill[]
  dmSchedules: DMSchedule[]
  discountOrder: DiscountOrderConfig
  selectedGameId: string | null

  setSelectedGameId: (id: string | null) => void
  addPlayer: (player: Player) => void
  addGameSession: (game: GameSession) => void
  updateGameSession: (game: GameSession) => void
  removeGameSession: (id: string) => void

  addWillingness: (willingness: Willingness) => void
  updateWillingness: (willingness: Willingness) => void
  batchUpdateWillingness: (willingnesses: Willingness[]) => void

  addBill: (bill: Bill) => void
  addBills: (bills: Bill[]) => void
  updateBill: (bill: Bill) => void

  addDMSchedule: (schedule: DMSchedule) => void
  updateDMSchedule: (schedule: DMSchedule) => void
  batchUpdateDMSchedules: (schedules: DMSchedule[]) => void

  updateDiscountOrder: (order: DiscountType[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  players: mockPlayers,
  scripts: mockScripts,
  dms: mockDMs,
  gameSessions: mockGameSessions,
  willingnessList: [],
  coupons: mockCoupons,
  bills: [],
  dmSchedules: generateMockDMSchedules(),
  discountOrder: { order: DEFAULT_DISCOUNT_ORDER },
  selectedGameId: null,

  setSelectedGameId: (id) => set({ selectedGameId: id }),

  addPlayer: (player) =>
    set((state) => ({ players: [...state.players, player] })),

  addGameSession: (game) =>
    set((state) => ({ gameSessions: [...state.gameSessions, game] })),

  updateGameSession: (game) =>
    set((state) => ({
      gameSessions: state.gameSessions.map((g) =>
        g.id === game.id ? game : g
      )
    })),

  removeGameSession: (id) =>
    set((state) => ({
      gameSessions: state.gameSessions.filter((g) => g.id !== id)
    })),

  addWillingness: (willingness) =>
    set((state) => ({ willingnessList: [...state.willingnessList, willingness] })),

  updateWillingness: (willingness) =>
    set((state) => ({
      willingnessList: state.willingnessList.map((w) =>
        w.id === willingness.id ? willingness : w
      )
    })),

  batchUpdateWillingness: (willingnesses) =>
    set((state) => {
      const map = new Map(state.willingnessList.map((w) => [w.id, w]))
      willingnesses.forEach((w) => map.set(w.id, w))
      return { willingnessList: Array.from(map.values()) }
    }),

  addBill: (bill) =>
    set((state) => ({ bills: [...state.bills, bill] })),

  addBills: (newBills) =>
    set((state) => ({ bills: [...state.bills, ...newBills] })),

  updateBill: (bill) =>
    set((state) => ({
      bills: state.bills.map((b) => (b.id === bill.id ? bill : b))
    })),

  addDMSchedule: (schedule) =>
    set((state) => ({ dmSchedules: [...state.dmSchedules, schedule] })),

  updateDMSchedule: (schedule) =>
    set((state) => ({
      dmSchedules: state.dmSchedules.map((s) =>
        s.id === schedule.id ? schedule : s
      )
    })),

  batchUpdateDMSchedules: (schedules) =>
    set((state) => {
      const map = new Map(state.dmSchedules.map((s) => [s.id, s]))
      schedules.forEach((s) => map.set(s.id, s))
      return { dmSchedules: Array.from(map.values()) }
    }),

  updateDiscountOrder: (order) =>
    set({ discountOrder: { order } })
}))
