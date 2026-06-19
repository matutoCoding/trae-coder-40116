import type { Player, Script, GameSession, MatchResult } from '../types'

const THEME_WEIGHT = 0.5
const DIFFICULTY_WEIGHT = 0.3
const TAG_BONUS_WEIGHT = 0.2

export function calculateThemeMatchScore(
  playerThemes: string[],
  scriptThemes: string[]
): number {
  if (playerThemes.length === 0 || scriptThemes.length === 0) return 0

  const intersection = playerThemes.filter(theme => scriptThemes.includes(theme))
  const union = [...new Set([...playerThemes, ...scriptThemes])]

  return intersection.length / union.length
}

export function calculateDifficultyMatchScore(
  playerDifficulties: string[],
  scriptDifficulty: string
): number {
  if (playerDifficulties.length === 0) return 0.5

  return playerDifficulties.includes(scriptDifficulty) ? 1 : 0.3
}

export function calculateTagBonus(player: Player, script: Script): number {
  let score = 0

  if (player.tags.some(tag => tag.includes('高玩') || tag.includes('推土机'))) {
    if (script.difficulty === '硬核' || script.difficulty === '骨灰') {
      score += 0.15
    }
  }

  if (player.tags.some(tag => tag.includes('情感') || tag.includes('菠萝头') === false)) {
    if (script.themes.includes('情感')) {
      score += 0.1
    }
  }

  if (player.tags.some(tag => tag.includes('新手'))) {
    if (script.difficulty === '新手' || script.difficulty === '进阶') {
      score += 0.1
    }
  }

  return Math.min(score, TAG_BONUS_WEIGHT)
}

export function calculateMatchScore(
  player: Player,
  script: Script
): number {
  const themeScore = calculateThemeMatchScore(player.preferredThemes, script.themes) * THEME_WEIGHT
  const difficultyScore = calculateDifficultyMatchScore(
    player.preferredDifficulty,
    script.difficulty
  ) * DIFFICULTY_WEIGHT
  const tagBonus = calculateTagBonus(player, script)

  return Math.round((themeScore + difficultyScore + tagBonus) * 100) / 100
}

export function getMatchDescription(score: number): string {
  if (score >= 0.8) return '完美契合'
  if (score >= 0.6) return '高度匹配'
  if (score >= 0.4) return '一般匹配'
  if (score >= 0.2) return '较低匹配'
  return '不太契合'
}

export function rankPlayersForGame(
  game: GameSession,
  script: Script,
  players: Player[],
  excludePlayerIds: string[] = []
): Array<{ player: Player; score: number; description: string }> {
  const availablePlayers = players.filter(p => !excludePlayerIds.includes(p.id))

  return availablePlayers
    .map(player => ({
      player,
      score: calculateMatchScore(player, script),
      description: getMatchDescription(calculateMatchScore(player, script))
    }))
    .sort((a, b) => b.score - a.score)
}

export function rankGamesForPlayer(
  player: Player,
  games: GameSession[],
  scripts: Script[]
): Array<{ game: GameSession; score: number; description: string }> {
  const availableGames = games.filter(g => g.status === '招募中')

  return availableGames
    .map(game => {
      const script = scripts.find(s => s.id === game.scriptId)
      if (!script) return null
      const score = calculateMatchScore(player, script)
      return {
        game,
        score,
        description: getMatchDescription(score)
      }
    })
    .filter((item): item is { game: GameSession; score: number; description: string } => item !== null)
    .sort((a, b) => b.score - a.score)
}

export function findMutualMatches(
  game: GameSession,
  script: Script,
  players: Player[],
  playerWillingMap: Map<string, boolean>,
  gameWillingMap: Map<string, boolean>
): MatchResult[] {
  const results: MatchResult[] = []

  players.forEach(player => {
    const playerWants = playerWillingMap.get(player.id) ?? false
    const gameWants = gameWillingMap.get(player.id) ?? false
    const mutual = playerWants && gameWants
    const score = calculateMatchScore(player, script)

    let reason = ''
    if (mutual) {
      reason = `双方互选成功！契合度：${(score * 100).toFixed(0)}%`
    } else if (playerWants && !gameWants) {
      reason = '玩家有意向，但局方暂未选择'
    } else if (!playerWants && gameWants) {
      reason = '局方已邀请，但玩家暂未回应'
    } else {
      reason = '双方暂无意向'
    }

    results.push({
      gameId: game.id,
      playerId: player.id,
      matchScore: score,
      mutualWillingness: mutual,
      reason
    })
  })

  return results.sort((a, b) => {
    if (a.mutualWillingness !== b.mutualWillingness) {
      return a.mutualWillingness ? -1 : 1
    }
    return b.matchScore - a.matchScore
  })
}
