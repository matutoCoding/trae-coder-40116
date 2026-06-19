import { v4 as uuidv4 } from 'uuid'
import type {
  Bill,
  GameSession,
  Player,
  Script,
  DiscountCoupon,
  DiscountDetail,
  DiscountOrderConfig,
  PaymentStatus
} from '../types'
import { applyMultipleDiscounts, calculateOptimalDiscount } from './discount'

export function generateBill(
  game: GameSession,
  player: Player,
  script: Script,
  coupons: DiscountCoupon[],
  orderConfig: DiscountOrderConfig,
  useOptimal: boolean = true
): Bill {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const originalAmount = script.price

  let discountDetails: DiscountDetail[]
  let finalAmount: number

  if (useOptimal) {
    const optimal = calculateOptimalDiscount(originalAmount, coupons, orderConfig)
    discountDetails = optimal.discountDetails
    finalAmount = optimal.finalAmount
  } else {
    const result = applyMultipleDiscounts(originalAmount, coupons, orderConfig)
    discountDetails = result.discountDetails
    finalAmount = result.finalAmount
  }

  return {
    id: `b-${uuidv4().slice(0, 8)}`,
    gameId: game.id,
    playerId: player.id,
    originalAmount,
    discountDetails,
    finalAmount,
    paymentStatus: '待支付' as PaymentStatus,
    createdAt: now
  }
}

export function generateBillsForGame(
  game: GameSession,
  players: Player[],
  script: Script,
  allPlayers: Player[],
  playerCouponsMap: Map<string, DiscountCoupon[]>,
  orderConfig: DiscountOrderConfig
): Bill[] {
  const bills: Bill[] = []

  game.playerIds.forEach(playerId => {
    const player = allPlayers.find(p => p.id === playerId)
    if (!player) return

    const coupons = playerCouponsMap.get(playerId) ?? []
    bills.push(generateBill(game, player, script, coupons, orderConfig))
  })

  return bills
}

export function markBillPaid(bill: Bill): Bill {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return {
    ...bill,
    paymentStatus: '已支付',
    paidAt: now
  }
}

export function markBillRefunded(bill: Bill): Bill {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return {
    ...bill,
    paymentStatus: '已退款',
    paidAt: now
  }
}

export function formatBillText(bill: Bill, playerName: string, scriptName: string): string {
  const lines = [
    '═══════════════════════════════════',
    '          剧本杀消费账单',
    '═══════════════════════════════════',
    '',
    `账单编号: ${bill.id}`,
    `玩家姓名: ${playerName}`,
    `剧本名称: ${scriptName}`,
    `局ID: ${bill.gameId}`,
    `生成时间: ${bill.createdAt}`,
    '',
    '───────────────────────────────────',
    `原价:          ¥${bill.originalAmount.toFixed(2)}`
  ]

  if (bill.discountDetails.length > 0) {
    lines.push('优惠明细:')
    bill.discountDetails.forEach(detail => {
      const typeLabel = detail.type === 'coupon' ? '折扣券' : '满减'
      lines.push(`  [${detail.appliedOrder}] ${typeLabel} - ${detail.couponName}: -¥${detail.discountAmount.toFixed(2)}`)
    })
  }

  const totalDiscount = bill.discountDetails.reduce((sum, d) => sum + d.discountAmount, 0)
  if (totalDiscount > 0) {
    lines.push(`优惠合计:       -¥${totalDiscount.toFixed(2)}`)
  }

  lines.push(
    '',
    '═══════════════════════════════════',
    `实付金额:       ¥${bill.finalAmount.toFixed(2)}`,
    '═══════════════════════════════════',
    '',
    `支付状态: ${bill.paymentStatus}`
  )

  if (bill.paidAt) {
    lines.push(`支付时间: ${bill.paidAt}`)
  }

  return lines.join('\n')
}

export function calculateGameTotalRevenue(bills: Bill[]): {
  totalOriginal: number; totalFinal: number; totalDiscount: number; paidCount: number; unpaidCount: number
} {
  let totalOriginal = 0
  let totalFinal = 0
  let totalDiscount = 0
  let paidCount = 0
  let unpaidCount = 0

  bills.forEach(bill => {
    totalOriginal += bill.originalAmount
    totalFinal += bill.finalAmount
    totalDiscount += bill.discountDetails.reduce((sum, d) => sum + d.discountAmount, 0)
    if (bill.paymentStatus === '已支付') {
      paidCount++
    } else {
      unpaidCount++
    }
  })

  return {
    totalOriginal: Math.round(totalOriginal * 100) / 100,
    totalFinal: Math.round(totalFinal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    paidCount,
    unpaidCount
  }
}
