import { v4 as uuidv4 } from 'uuid'
import type {
  Bill,
  GameSession,
  Player,
  Script,
  DiscountCoupon,
  DiscountDetail,
  DiscountOrderConfig,
  PaymentStatus,
  PaymentRecord
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
    paymentRecords: [],
    paidAmount: 0,
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

export function addPayment(
  bill: Bill,
  amount: number,
  type: PaymentRecord['type'] = '其他',
  note?: string
): Bill {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const record: PaymentRecord = {
    id: `pay-${uuidv4().slice(0, 8)}`,
    amount,
    type,
    note,
    paidAt: now
  }

  const paidAmount = Math.min(
    Math.round((bill.paidAmount + amount) * 100) / 100,
    bill.finalAmount
  )

  let paymentStatus: PaymentStatus = bill.paymentStatus
  if (paidAmount >= bill.finalAmount - 0.001) {
    paymentStatus = '已支付'
  } else if (paidAmount > 0) {
    paymentStatus = '部分支付'
  }

  return {
    ...bill,
    paymentRecords: [...bill.paymentRecords, record],
    paidAmount,
    paymentStatus,
    paidAt: paymentStatus === '已支付' ? now : bill.paidAt
  }
}

export function markBillPaid(bill: Bill): Bill {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const remainAmount = Math.max(0, Math.round((bill.finalAmount - bill.paidAmount) * 100) / 100)

  const records: PaymentRecord[] = [...bill.paymentRecords]
  if (remainAmount > 0.001) {
    records.push({
      id: `pay-${uuidv4().slice(0, 8)}`,
      amount: remainAmount,
      type: '全款',
      paidAt: now
    })
  }

  return {
    ...bill,
    paymentRecords: records,
    paidAmount: bill.finalAmount,
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

  if (bill.paymentRecords.length > 0) {
    lines.push('', '───────────────────────────────────', '收款记录:')
    bill.paymentRecords.forEach((r, i) => {
      lines.push(`  ${i + 1}. [${r.type}] ¥${r.amount.toFixed(2)}  ${r.paidAt}`)
      if (r.note) lines.push(`     ${r.note}`)
    })
    lines.push(
      '',
      `已收: ¥${bill.paidAmount.toFixed(2)}`,
      `待收: ¥${Math.max(0, bill.finalAmount - bill.paidAmount).toFixed(2)}`
    )
  }

  if (bill.paidAt && bill.paymentStatus === '已支付') {
    lines.push(`支付完成时间: ${bill.paidAt}`)
  }

  return lines.join('\n')
}

export function calculateGameTotalRevenue(bills: Bill[]): {
  totalOriginal: number
  totalFinal: number
  totalDiscount: number
  totalPaid: number
  totalUnpaid: number
  paidCount: number
  partialCount: number
  unpaidCount: number
} {
  let totalOriginal = 0
  let totalFinal = 0
  let totalDiscount = 0
  let totalPaid = 0
  let totalUnpaid = 0
  let paidCount = 0
  let partialCount = 0
  let unpaidCount = 0

  bills.forEach(bill => {
    totalOriginal += bill.originalAmount
    totalFinal += bill.finalAmount
    totalDiscount += bill.discountDetails.reduce((sum, d) => sum + d.discountAmount, 0)
    totalPaid += bill.paidAmount
    totalUnpaid += bill.finalAmount - bill.paidAmount
    if (bill.paymentStatus === '已支付') {
      paidCount++
    } else if (bill.paymentStatus === '部分支付') {
      partialCount++
    } else if (bill.paymentStatus === '待支付') {
      unpaidCount++
    }
  })

  return {
    totalOriginal: Math.round(totalOriginal * 100) / 100,
    totalFinal: Math.round(totalFinal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalUnpaid: Math.round(totalUnpaid * 100) / 100,
    paidCount,
    partialCount,
    unpaidCount
  }
}
