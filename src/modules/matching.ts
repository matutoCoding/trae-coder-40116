import { v4 as uuidv4 } from 'uuid'
import type {
  GameSession,
  Player,
  Script,
  Willingness,
  MatchResult,
  GameStatus,
  WillingnessStatus
} from '../types'
import { calculateMatchScore, findMutualMatches } from './matchScore'

export function createGameSession(
  script: Script,
  scheduledTime: string,
  hostPlayer?: Player,
  room?: string,
  dmId?: string,
  note?: string
): GameSession {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')

  return {
    id: `g-${uuidv4().slice(0, 8)}`,
    scriptId: script.id,
    scriptName: script.name,
    scheduledTime,
    room,
    dmId,
    requiredPlayers: script.minPlayers,
    currentPlayers: hostPlayer ? 1 : 0,
    status: '招募中' as GameStatus,
    playerIds: hostPlayer ? [hostPlayer.id] : [],
    hostPlayerId: hostPlayer?.id,
    createdAt: now,
    note
  }
}

export function createWillingness(
  playerId: string,
  gameId: string,
  matchScore: number,
  playerToGame: boolean = false,
  gameToPlayer: boolean = false
): Willingness {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')

  return {
    id: `w-${uuidv4().slice(0, 8)}`,
    playerId,
    gameId,
    playerToGame,
    gameToPlayer,
    matchScore,
    status: '待确认' as WillingnessStatus,
    createdAt: now,
    updatedAt: now
  }
}

export function playerExpressWillingness(willingness: Willingness, wants: boolean): Willingness {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const updated: Willingness = {
    ...willingness,
    playerToGame: wants,
    updatedAt: now
  }

  if (updated.playerToGame && updated.gameToPlayer) {
    updated.status = '已同意'
  } else if (!wants && willingness.gameToPlayer) {
    updated.status = '已拒绝'
  }

  return updated
}

export function gameExpressWillingness(willingness: Willingness, wants: boolean): Willingness {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const updated: Willingness = {
    ...willingness,
    gameToPlayer: wants,
    updatedAt: now
  }

  if (updated.playerToGame && updated.gameToPlayer) {
    updated.status = '已同意'
  } else if (!wants && willingness.playerToGame) {
    updated.status = '已拒绝'
  }

  return updated
}

export function isMutualWillingness(willingness: Willingness): boolean {
  return willingness.playerToGame && willingness.gameToPlayer
}

export function canAddPlayerToGame(game: GameSession, script: Script): boolean {
  return game.currentPlayers < script.maxPlayers && game.status === '招募中'
}

export function addPlayerToGame(game: GameSession, playerId: string): GameSession | null {
  if (game.playerIds.includes(playerId)) return null
  if (game.status !== '招募中') return null

  const updated: GameSession = {
    ...game,
    playerIds: [...game.playerIds, playerId],
    currentPlayers: game.currentPlayers + 1
  }

  if (updated.currentPlayers >= updated.requiredPlayers) {
    updated.status = '已成团'
  }

  return updated
}

export function removePlayerFromGame(game: GameSession, playerId: string): GameSession {
  if (!game.playerIds.includes(playerId)) return game

  const updated: GameSession = {
    ...game,
    playerIds: game.playerIds.filter(id => id !== playerId),
    currentPlayers: game.currentPlayers - 1
  }

  if (updated.status === '已成团' && updated.currentPlayers < updated.requiredPlayers) {
    updated.status = '招募中'
  }

  if (playerId === game.hostPlayerId) {
    updated.hostPlayerId = updated.playerIds[0] || undefined
  }

  return updated
}

export function processMutualMatches(
  game: GameSession,
  script: Script,
  players: Player[],
  willingnessList: Willingness[]
): {
  updatedGame: GameSession
  matchedPlayers: Player[]
  matchResults: MatchResult[]
  updatedWillingness: Willingness[]
} {
  const playerWillingMap = new Map<string, boolean>()
  const gameWillingMap = new Map<string, boolean>()

  willingnessList.forEach(w => {
    if (w.gameId === game.id) {
      playerWillingMap.set(w.playerId, w.playerToGame)
      gameWillingMap.set(w.playerId, w.gameToPlayer)
    }
  })

  const matchResults = findMutualMatches(
    game,
    script,
    players,
    playerWillingMap,
    gameWillingMap
  )

  let updatedGame = { ...game }
  const matchedPlayers: Player[] = []
  const updatedWillingness: Willingness[] = []

  for (const result of matchResults) {
    if (result.mutualWillingness && canAddPlayerToGame(updatedGame, script)) {
      const newGame = addPlayerToGame(updatedGame, result.playerId)
      if (newGame) {
        updatedGame = newGame
        const player = players.find(p => p.id === result.playerId)
        if (player) matchedPlayers.push(player)
      }
    }

    const willingness = willingnessList.find(
      w => w.gameId === game.id && w.playerId === result.playerId
    )
    if (willingness) {
      if (result.mutualWillingness) {
        updatedWillingness.push({
          ...willingness,
          status: '已同意',
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
        })
      }
    } else {
      updatedWillingness.push(
        createWillingness(
          result.playerId,
          game.id,
          calculateMatchScore(
            players.find(p => p.id === result.playerId)!,
            script
          ),
          result.mutualWillingness,
          result.mutualWillingness
        )
      )
    }
  }

  return {
    updatedGame,
    matchedPlayers,
    matchResults,
    updatedWillingness
  }
}
