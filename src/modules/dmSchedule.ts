import { v4 as uuidv4 } from 'uuid'
import type { DM, DMSchedule, GameSession, Script } from '../types'

export function createDMSchedule(
  dmId: string,
  date: string,
  timeSlot: string,
  status: '空闲' | '已安排' | '休息' = '空闲',
  gameId?: string
): DMSchedule {
  return {
    id: `sch-${uuidv4().slice(0, 8)}`,
    dmId,
    date,
    timeSlot,
    gameId,
    status
  }
}

export function getAvailableDMs(
  dms: DM[],
  schedules: DMSchedule[],
  date: string,
  timeSlot: string,
  scriptId?: string
): Array<{ dm: DM; isSkilled: boolean }> {
  const occupiedDMIds = new Set(
    schedules
      .filter(s => s.date === date && s.timeSlot === timeSlot && s.status === '已安排')
      .map(s => s.dmId)
  )

  return dms
    .filter(dm => !occupiedDMIds.has(dm.id))
    .map(dm => ({
      dm,
      isSkilled: scriptId ? dm.skilledScripts.includes(scriptId) : true
    }))
    .sort((a, b) => {
      if (a.isSkilled !== b.isSkilled) return a.isSkilled ? -1 : 1
      return b.dm.rating - a.dm.rating
    })
}

export function assignDMToGame(
  schedules: DMSchedule[],
  dmId: string,
  game: GameSession
): { schedules: DMSchedule[]; success: boolean; message: string } {
  const [datePart, timePart] = game.scheduledTime.split(' ')
  const date = datePart
  const hour = parseInt(timePart.split(':')[0])
  const timeSlot = hour < 12 ? '10:00' : hour < 17 ? '14:00' : '19:00'

  const existingSchedule = schedules.find(
    s => s.dmId === dmId && s.date === date && s.timeSlot === timeSlot
  )

  if (existingSchedule) {
    if (existingSchedule.status === '已安排') {
      return { schedules, success: false, message: '该DM此时段已有安排' }
    }
    if (existingSchedule.status === '休息') {
      return { schedules, success: false, message: '该DM此时段休息' }
    }

    const updatedSchedules = schedules.map(s =>
      s.id === existingSchedule.id
        ? { ...s, status: '已安排' as const, gameId: game.id }
        : s
    )
    return { schedules: updatedSchedules, success: true, message: '排班成功' }
  }

  const newSchedule = createDMSchedule(dmId, date, timeSlot, '已安排', game.id)
  return { schedules: [...schedules, newSchedule], success: true, message: '排班成功' }
}

export function unassignDMFromGame(
  schedules: DMSchedule[],
  gameId: string
): DMSchedule[] {
  return schedules.map(s =>
    s.gameId === gameId
      ? { ...s, status: '空闲' as const, gameId: undefined }
      : s
  )
}

export function getDMScheduleForDateRange(
  schedules: DMSchedule[],
  dmId: string,
  startDate: string,
  endDate: string
): DMSchedule[] {
  return schedules
    .filter(s => s.dmId === dmId && s.date >= startDate && s.date <= endDate)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeSlot.localeCompare(b.timeSlot)
    })
}

export function getDMScheduleStats(
  schedules: DMSchedule[],
  dmId: string
): { total: number; arranged: number; free: number; rest: number } {
  const dmSchedules = schedules.filter(s => s.dmId === dmId)
  return {
    total: dmSchedules.length,
    arranged: dmSchedules.filter(s => s.status === '已安排').length,
    free: dmSchedules.filter(s => s.status === '空闲').length,
    rest: dmSchedules.filter(s => s.status === '休息').length
  }
}

export function recommendDMForGame(
  dms: DM[],
  schedules: DMSchedule[],
  game: GameSession,
  script: Script
): Array<{ dm: DM; score: number; reason: string }> {
  const [datePart, timePart] = game.scheduledTime.split(' ')
  const date = datePart
  const hour = parseInt(timePart.split(':')[0])
  const timeSlot = hour < 12 ? '10:00' : hour < 17 ? '14:00' : '19:00'

  const availableDMs = getAvailableDMs(dms, schedules, date, timeSlot, script.id)

  return availableDMs.map(({ dm, isSkilled }) => {
    let score = 0
    const reasons: string[] = []

    if (isSkilled) {
      score += 50
      reasons.push('擅长此剧本')
    }

    score += dm.rating * 10
    if (dm.rating >= 4.8) {
      reasons.push('高评分DM')
    }

    const dmGamesScheduled = schedules.filter(
      s => s.dmId === dm.id && s.status === '已安排'
    ).length
    const workloadScore = Math.max(0, 30 - dmGamesScheduled * 5)
    score += workloadScore
    if (workloadScore >= 20) {
      reasons.push('档期充裕')
    }

    return {
      dm,
      score: Math.min(score, 100),
      reason: reasons.length > 0 ? reasons.join('、') : '可排班'
    }
  }).sort((a, b) => b.score - a.score)
}
