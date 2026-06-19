export type ScriptTheme =
  | '恐怖'
  | '情感'
  | '推理'
  | '机制'
  | '欢乐'
  | '硬核'
  | '变格'
  | '本格'
  | '古风'
  | '现代'
  | '科幻'
  | '谍战'

export type ScriptDifficulty = '新手' | '进阶' | '硬核' | '骨灰'

export type GameStatus = '招募中' | '已成团' | '进行中' | '已结束' | '已取消'

export type WillingnessStatus = '待确认' | '已同意' | '已拒绝'

export type DiscountType = 'coupon' | 'full_reduction'

export type PaymentStatus = '待支付' | '已支付' | '已退款'

export interface Player {
  id: string
  name: string
  phone: string
  avatar?: string
  preferredThemes: ScriptTheme[]
  preferredDifficulty: ScriptDifficulty[]
  tags: string[]
  registeredAt: string
  totalGames: number
}

export interface Script {
  id: string
  name: string
  themes: ScriptTheme[]
  difficulty: ScriptDifficulty
  minPlayers: number
  maxPlayers: number
  duration: number
  price: number
  description: string
  coverImage?: string
}

export interface DM {
  id: string
  name: string
  phone: string
  avatar?: string
  skilledScripts: string[]
  rating: number
  schedules: DMSchedule[]
}

export interface DMSchedule {
  id: string
  dmId: string
  date: string
  timeSlot: string
  gameId?: string
  status: '空闲' | '已安排' | '休息'
}

export interface GameSession {
  id: string
  scriptId: string
  scriptName: string
  scheduledTime: string
  room?: string
  dmId?: string
  requiredPlayers: number
  currentPlayers: number
  status: GameStatus
  playerIds: string[]
  hostPlayerId?: string
  createdAt: string
  note?: string
}

export interface Willingness {
  id: string
  playerId: string
  gameId: string
  playerToGame: boolean
  gameToPlayer: boolean
  matchScore: number
  status: WillingnessStatus
  createdAt: string
  updatedAt: string
}

export interface DiscountCoupon {
  id: string
  name: string
  type: DiscountType
  discountRate?: number
  discountAmount?: number
  threshold?: number
  validFrom: string
  validTo: string
  isStackable: boolean
  maxDiscount?: number
}

export interface DiscountOrderConfig {
  order: DiscountType[]
}

export interface Bill {
  id: string
  gameId: string
  playerId: string
  originalAmount: number
  discountDetails: DiscountDetail[]
  finalAmount: number
  paymentStatus: PaymentStatus
  paidAt?: string
  createdAt: string
}

export interface DiscountDetail {
  couponId: string
  couponName: string
  type: DiscountType
  discountAmount: number
  appliedOrder: number
}

export interface MatchResult {
  gameId: string
  playerId: string
  matchScore: number
  mutualWillingness: boolean
  reason: string
}
