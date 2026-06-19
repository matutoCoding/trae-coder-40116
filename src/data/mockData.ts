import type {
  Player,
  Script,
  DM,
  GameSession,
  DiscountCoupon,
  DMSchedule
} from '../types'

export const mockPlayers: Player[] = [
  {
    id: 'p1',
    name: '张小明',
    phone: '13800138001',
    preferredThemes: ['恐怖', '推理', '硬核'],
    preferredDifficulty: ['进阶', '硬核'],
    tags: ['高玩', '喜欢推理'],
    registeredAt: '2024-01-15',
    totalGames: 23
  },
  {
    id: 'p2',
    name: '李小红',
    phone: '13800138002',
    preferredThemes: ['情感', '古风', '欢乐'],
    preferredDifficulty: ['新手', '进阶'],
    tags: ['情感本爱好者'],
    registeredAt: '2024-02-20',
    totalGames: 15
  },
  {
    id: 'p3',
    name: '王小强',
    phone: '13800138003',
    preferredThemes: ['机制', '谍战', '现代'],
    preferredDifficulty: ['进阶', '硬核'],
    tags: ['机制本专业户'],
    registeredAt: '2024-03-10',
    totalGames: 31
  },
  {
    id: 'p4',
    name: '赵小丽',
    phone: '13800138004',
    preferredThemes: ['推理', '本格', '硬核'],
    preferredDifficulty: ['硬核', '骨灰'],
    tags: ['推土机', '菠萝头'],
    registeredAt: '2024-01-05',
    totalGames: 45
  },
  {
    id: 'p5',
    name: '陈小华',
    phone: '13800138005',
    preferredThemes: ['恐怖', '变格', '情感'],
    preferredDifficulty: ['新手', '进阶'],
    tags: ['新手友好'],
    registeredAt: '2024-04-01',
    totalGames: 8
  }
]

export const mockScripts: Script[] = [
  {
    id: 's1',
    name: '雾都疑云',
    themes: ['推理', '硬核', '本格'],
    difficulty: '硬核',
    minPlayers: 5,
    maxPlayers: 7,
    duration: 300,
    price: 128,
    description: '迷雾笼罩的伦敦，一桩离奇的连环杀人案...'
  },
  {
    id: 's2',
    name: '长安月下',
    themes: ['古风', '情感', '推理'],
    difficulty: '进阶',
    minPlayers: 6,
    maxPlayers: 8,
    duration: 240,
    price: 108,
    description: '盛唐长安，一段跨越千年的爱恨情仇...'
  },
  {
    id: 's3',
    name: '深空迷航',
    themes: ['科幻', '机制', '变格'],
    difficulty: '进阶',
    minPlayers: 4,
    maxPlayers: 6,
    duration: 270,
    price: 138,
    description: '2157年，深空探索飞船失联...'
  },
  {
    id: 's4',
    name: '夜半钟声',
    themes: ['恐怖', '变格', '推理'],
    difficulty: '进阶',
    minPlayers: 5,
    maxPlayers: 7,
    duration: 240,
    price: 118,
    description: '午夜十二点的古宅，回荡着诡异的钟声...'
  },
  {
    id: 's5',
    name: '风声再起',
    themes: ['谍战', '机制', '现代'],
    difficulty: '硬核',
    minPlayers: 6,
    maxPlayers: 8,
    duration: 300,
    price: 148,
    description: '1940年代上海，一场惊心动魄的谍战...'
  }
]

export const mockDMs: DM[] = [
  {
    id: 'd1',
    name: 'DM 阿杰',
    phone: '13900139001',
    skilledScripts: ['s1', 's4', 's5'],
    rating: 4.8,
    schedules: []
  },
  {
    id: 'd2',
    name: 'DM 小月',
    phone: '13900139002',
    skilledScripts: ['s2', 's3'],
    rating: 4.9,
    schedules: []
  },
  {
    id: 'd3',
    name: 'DM 老王',
    phone: '13900139003',
    skilledScripts: ['s1', 's2', 's3', 's4', 's5'],
    rating: 4.7,
    schedules: []
  }
]

export const mockGameSessions: GameSession[] = [
  {
    id: 'g1',
    scriptId: 's1',
    scriptName: '雾都疑云',
    scheduledTime: '2025-06-25 19:00',
    room: 'A101',
    dmId: 'd1',
    requiredPlayers: 6,
    currentPlayers: 3,
    status: '招募中',
    playerIds: ['p1', 'p4'],
    hostPlayerId: 'p1',
    createdAt: '2025-06-20 10:00'
  },
  {
    id: 'g2',
    scriptId: 's2',
    scriptName: '长安月下',
    scheduledTime: '2025-06-26 14:00',
    room: 'B202',
    dmId: 'd2',
    requiredPlayers: 7,
    currentPlayers: 4,
    status: '招募中',
    playerIds: ['p2'],
    hostPlayerId: 'p2',
    createdAt: '2025-06-20 11:00'
  },
  {
    id: 'g3',
    scriptId: 's4',
    scriptName: '夜半钟声',
    scheduledTime: '2025-06-27 20:00',
    room: 'C303',
    dmId: undefined,
    requiredPlayers: 6,
    currentPlayers: 2,
    status: '招募中',
    playerIds: ['p5'],
    hostPlayerId: 'p5',
    createdAt: '2025-06-20 12:00'
  }
]

export const mockCoupons: DiscountCoupon[] = [
  {
    id: 'c1',
    name: '新人8折券',
    type: 'coupon',
    discountRate: 0.8,
    validFrom: '2025-01-01',
    validTo: '2025-12-31',
    isStackable: true,
    maxDiscount: 50
  },
  {
    id: 'c2',
    name: '满100减20',
    type: 'full_reduction',
    discountAmount: 20,
    threshold: 100,
    validFrom: '2025-01-01',
    validTo: '2025-12-31',
    isStackable: true
  },
  {
    id: 'c3',
    name: '会员7.5折券',
    type: 'coupon',
    discountRate: 0.75,
    validFrom: '2025-01-01',
    validTo: '2025-12-31',
    isStackable: false,
    maxDiscount: 80
  },
  {
    id: 'c4',
    name: '满200减50',
    type: 'full_reduction',
    discountAmount: 50,
    threshold: 200,
    validFrom: '2025-01-01',
    validTo: '2025-12-31',
    isStackable: true
  }
]

export const generateMockDMSchedules = (): DMSchedule[] => {
  const schedules: DMSchedule[] = []
  const dates = ['2025-06-24', '2025-06-25', '2025-06-26', '2025-06-27', '2025-06-28']
  const timeSlots = ['10:00', '14:00', '19:00']
  const dmIds = ['d1', 'd2', 'd3']
  let idCounter = 1

  dates.forEach(date => {
    timeSlots.forEach(slot => {
      dmIds.forEach(dmId => {
        const statuses: ('空闲' | '已安排' | '休息')[] = ['空闲', '空闲', '空闲', '已安排', '休息']
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        schedules.push({
          id: `sch-${idCounter++}`,
          dmId,
          date,
          timeSlot: slot,
          status: randomStatus,
          gameId: randomStatus === '已安排' ? `g${Math.floor(Math.random() * 3) + 1}` : undefined
        })
      })
    })
  })

  return schedules
}
