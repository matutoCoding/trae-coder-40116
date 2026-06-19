import type { Player, GameSession, Bill } from '../types'

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportPlayersCSV(players: Player[]): string {
  const headers = [
    '玩家ID', '姓名', '电话', '偏好题材', '偏好难度', '标签', '注册时间', '总场次'
  ]
  const rows = players.map(p => [
    p.id,
    p.name,
    p.phone,
    p.preferredThemes.join('、'),
    p.preferredDifficulty.join('、'),
    p.tags.join('、'),
    p.registeredAt,
    p.totalGames
  ])
  return [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n')
}

export function exportGamesCSV(games: GameSession[], allPlayers: Player[]): string {
  const headers = [
    '局ID', '剧本', '开场时间', '房间', 'DM', '状态', '人数', '玩家名单', '发起人', '创建时间', '备注'
  ]

  const playerNameMap = new Map(allPlayers.map(p => [p.id, p.name]))

  const rows = games.map(g => [
    g.id,
    g.scriptName,
    g.scheduledTime,
    g.room || '',
    g.dmId || '',
    g.status,
    `${g.currentPlayers}/${g.requiredPlayers}`,
    g.playerIds.map(id => playerNameMap.get(id) || id).join('、'),
    g.hostPlayerId ? playerNameMap.get(g.hostPlayerId) || '' : '',
    g.createdAt,
    g.note || ''
  ])

  return [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n')
}

export function exportBillsCSV(
  bills: Bill[],
  allPlayers: Player[],
  allGames: GameSession[]
): string {
  const headers = [
    '账单编号',
    '玩家',
    '剧本',
    '局ID',
    '原价',
    '优惠金额',
    '优惠项数',
    '应收金额',
    '已收金额',
    '待收金额',
    '支付状态',
    '生成时间',
    '支付完成时间',
    '收款记录'
  ]

  const playerNameMap = new Map(allPlayers.map(p => [p.id, p.name]))
  const gameNameMap = new Map(allGames.map(g => [g.id, g.scriptName]))

  const rows = bills.map(b => {
    const totalDiscount = b.discountDetails.reduce((s, d) => s + d.discountAmount, 0)
    const remain = Math.max(0, b.finalAmount - b.paidAmount)
    const records = b.paymentRecords
      .map(r => `[${r.type}]¥${r.amount.toFixed(2)}(${r.paidAt})`)
      .join('；')
    return [
      b.id,
      playerNameMap.get(b.playerId) || b.playerId,
      gameNameMap.get(b.gameId) || b.gameId,
      b.gameId,
      b.originalAmount.toFixed(2),
      totalDiscount.toFixed(2),
      b.discountDetails.length,
      b.finalAmount.toFixed(2),
      b.paidAmount.toFixed(2),
      remain.toFixed(2),
      b.paymentStatus,
      b.createdAt,
      b.paidAt || '',
      records
    ]
  })

  return [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n')
}
