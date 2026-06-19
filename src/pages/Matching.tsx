import React, { useMemo, useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Select,
  Tag,
  Button,
  List,
  Avatar,
  Progress,
  Switch,
  Space,
  Divider,
  Empty,
  message,
  Tooltip,
  Modal
} from 'antd'
import {
  HeartFilled,
  HeartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  StarOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  SwapOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import {
  rankPlayersForGame,
  rankGamesForPlayer,
  getMatchDescription,
  findMutualMatches
} from '../modules/matchScore'
import {
  processMutualMatches,
  playerExpressWillingness,
  gameExpressWillingness,
  createWillingness
} from '../modules/matching'
import { calculateMatchScore } from '../modules/matchScore'

const Matching: React.FC = () => {
  const {
    gameSessions,
    players,
    scripts,
    willingnessList,
    selectedGameId,
    setSelectedGameId,
    updateGameSession,
    updateWillingness,
    addWillingness,
    batchUpdateWillingness
  } = useAppStore()

  const [mode, setMode] = useState<'game' | 'player'>('game')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [showMatchResults, setShowMatchResults] = useState(false)

  useEffect(() => {
    if (selectedGameId) {
      setMode('game')
    }
  }, [selectedGameId])

  const activeGames = gameSessions.filter(g => g.status === '招募中')
  const currentGameId = selectedGameId || (activeGames[0]?.id ?? null)
  const currentGame = gameSessions.find(g => g.id === currentGameId)
  const currentScript = currentGame ? scripts.find(s => s.id === currentGame.scriptId) : null
  const currentPlayer = players.find(p => p.id === selectedPlayerId)

  const rankedPlayers = useMemo(() => {
    if (!currentGame || !currentScript) return []
    return rankPlayersForGame(currentGame, currentScript, players, currentGame.playerIds)
  }, [currentGame, currentScript, players])

  const rankedGames = useMemo(() => {
    if (!currentPlayer) return []
    return rankGamesForPlayer(currentPlayer, gameSessions, scripts)
  }, [currentPlayer, gameSessions, scripts])

  const getWillingness = (gameId: string, playerId: string) =>
    willingnessList.find(w => w.gameId === gameId && w.playerId === playerId)

  const handlePlayerWillingnessChange = (gameId: string, playerId: string, wants: boolean) => {
    const existing = getWillingness(gameId, playerId)
    if (existing) {
      const updated = playerExpressWillingness(existing, wants)
      updateWillingness(updated)
    } else {
      const script = scripts.find(s => {
        const game = gameSessions.find(g => g.id === gameId)
        return game ? s.id === game.scriptId : false
      })
      const player = players.find(p => p.id === playerId)
      if (script && player) {
        const newW = createWillingness(playerId, gameId, calculateMatchScore(player, script), wants, false)
        addWillingness(newW)
      }
    }
    message.info(wants ? '玩家已表达意向' : '玩家已取消意向')
  }

  const handleGameWillingnessChange = (gameId: string, playerId: string, wants: boolean) => {
    const existing = getWillingness(gameId, playerId)
    if (existing) {
      const updated = gameExpressWillingness(existing, wants)
      updateWillingness(updated)
    } else {
      const script = scripts.find(s => {
        const game = gameSessions.find(g => g.id === gameId)
        return game ? s.id === game.scriptId : false
      })
      const player = players.find(p => p.id === playerId)
      if (script && player) {
        const newW = createWillingness(playerId, gameId, calculateMatchScore(player, script), false, wants)
        addWillingness(newW)
      }
    }
    message.info(wants ? '局方已邀请该玩家' : '局方已撤回邀请')
  }

  const handleProcessMatches = () => {
    if (!currentGame || !currentScript) return
    const result = processMutualMatches(
      currentGame,
      currentScript,
      players,
      willingnessList
    )
    updateGameSession(result.updatedGame)
    batchUpdateWillingness(result.updatedWillingness)
    setShowMatchResults(true)

    Modal.success({
      title: '撮合结果',
      content: (
        <div>
          <p>本次成功撮合 <strong style={{ color: '#52c41a' }}>{result.matchedPlayers.length}</strong> 位玩家</p>
          <p>当前人数：{result.updatedGame.currentPlayers} / {result.updatedGame.requiredPlayers}</p>
          <div style={{ marginTop: 12 }}>
            {result.matchedPlayers.length > 0 ? (
              <List
                size="small"
                dataSource={result.matchedPlayers}
                renderItem={p => (
                  <List.Item>
                    <Avatar icon={<UserOutlined />} />
                    <span style={{ marginLeft: 12 }}>{p.name}</span>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 'auto' }} />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无双向匹配的玩家" />
            )}
          </div>
        </div>
      ),
      okText: '确定'
    })
  }

  const renderScoreColor = (score: number) => {
    if (score >= 0.8) return 'match-score-high'
    if (score >= 0.5) return 'match-score-mid'
    return 'match-score-low'
  }

  const renderScoreProgress = (score: number) => (
    <Progress
      type="circle"
      size={60}
      percent={Math.round(score * 100)}
      format={percent => `${percent}%`}
      strokeColor={
        score >= 0.8 ? '#52c41a' : score >= 0.5 ? '#faad14' : '#ff4d4f'
      }
    />
  )

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" align="center">
          <span>撮合模式：</span>
          <Button.Group>
            <Button
              type={mode === 'game' ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              onClick={() => setMode('game')}
            >
              按局找玩家
            </Button>
            <Button
              type={mode === 'player' ? 'primary' : 'default'}
              icon={<SwapOutlined />}
              onClick={() => setMode('player')}
            >
              按玩家找局
            </Button>
          </Button.Group>

          {mode === 'game' ? (
            <Select
              style={{ minWidth: 280 }}
              placeholder="选择拼场局"
              value={currentGameId}
              onChange={val => setSelectedGameId(val)}
              options={activeGames.map(g => ({
                label: `${g.scriptName} (${g.scheduledTime}) - ${g.currentPlayers}/${g.requiredPlayers}人`,
                value: g.id
              }))}
            />
          ) : (
            <Select
              style={{ minWidth: 280 }}
              placeholder="选择玩家"
              value={selectedPlayerId}
              onChange={val => setSelectedPlayerId(val)}
              options={players.map(p => ({
                label: `${p.name} (已玩${p.totalGames}场)`,
                value: p.id
              }))}
            />
          )}

          {mode === 'game' && currentGame && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleProcessMatches}
              disabled={rankedPlayers.length === 0}
            >
              执行双向撮合
            </Button>
          )}
        </Space>
      </Card>

      {mode === 'game' && currentGame && currentScript && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              title="拼场局信息"
              bordered={false}
            >
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ color: '#722ed1', marginBottom: 8 }}>{currentGame.scriptName}</h3>
                <div style={{ marginBottom: 8 }}>
                  {currentScript.themes.map(t => (
                    <Tag key={t} color="purple">{t}</Tag>
                  ))}
                  <Tag color="orange">{currentScript.difficulty}</Tag>
                </div>
                <p style={{ color: '#666', marginBottom: 4 }}>
                  <strong>开场时间：</strong>{currentGame.scheduledTime}
                </p>
                <p style={{ color: '#666', marginBottom: 4 }}>
                  <strong>房间：</strong>{currentGame.room || '待定'}
                </p>
                <p style={{ color: '#666', marginBottom: 8 }}>
                  <strong>费用：</strong>¥{currentScript.price}/人
                </p>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>凑人进度</span>
                    <strong>{currentGame.currentPlayers} / {currentGame.requiredPlayers}</strong>
                  </div>
                  <Progress
                    percent={Math.round((currentGame.currentPlayers / currentGame.requiredPlayers) * 100)}
                    strokeColor="#722ed1"
                    status={currentGame.currentPlayers >= currentGame.requiredPlayers ? 'success' : 'active'}
                  />
                </div>
              </div>

              {currentGame.playerIds.length > 0 && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <div>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>已加入玩家：</div>
                    {currentGame.playerIds.map(pid => {
                      const p = players.find(pl => pl.id === pid)
                      return p ? (
                        <Tag key={pid} color="blue" style={{ marginBottom: 4 }}>
                          <Avatar size="small" icon={<UserOutlined />} /> {p.name}
                          {pid === currentGame.hostPlayerId && ' (发起)'}
                        </Tag>
                      ) : null
                    })}
                  </div>
                </>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card
              title="推荐玩家（按口味契合度排序）"
              bordered={false}
              extra={
                <Space>
                  <span style={{ color: '#999' }}>共 {rankedPlayers.length} 位待撮合</span>
                </Space>
              }
            >
              {rankedPlayers.length === 0 ? (
                <Empty description="所有玩家都已加入本局或无可用玩家" />
              ) : (
                <List
                  dataSource={rankedPlayers}
                  renderItem={({ player, score, description }) => {
                    const willingness = getWillingness(currentGame.id, player.id)
                    return (
                      <List.Item
                        key={player.id}
                        style={{
                          padding: '16px 0',
                          borderBottom: '1px solid #f0f0f0'
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              size={48}
                              icon={<UserOutlined />}
                              style={{ background: '#722ed1' }}
                            />
                          }
                          title={
                            <Space>
                              <strong>{player.name}</strong>
                              <span style={{ fontSize: 12, color: '#999' }}>
                                已玩{player.totalGames}场
                              </span>
                              <Tag
                                color={
                                  score >= 0.8 ? 'green'
                                    : score >= 0.5 ? 'orange'
                                    : 'red'
                                }
                              >
                                {description}
                              </Tag>
                              {willingness?.status === '已同意' && (
                                <Tag icon={<CheckCircleOutlined />} color="success">
                                  双向匹配
                                </Tag>
                              )}
                            </Space>
                          }
                          description={
                            <div>
                              <div style={{ marginBottom: 4 }}>
                                <span style={{ color: '#999', marginRight: 8 }}>偏好题材：</span>
                                {player.preferredThemes.slice(0, 4).map(t => (
                                  <Tag key={t} style={{ marginBottom: 2 }}>{t}</Tag>
                                ))}
                              </div>
                              <div>
                                <span style={{ color: '#999', marginRight: 8 }}>标签：</span>
                                {player.tags.map(t => (
                                  <Tag key={t} color="blue">{t}</Tag>
                                ))}
                              </div>
                            </div>
                          }
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                          {renderScoreProgress(score)}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
                            <Tooltip title={willingness?.playerToGame ? '取消玩家意向' : '玩家想玩'}>
                              <Space>
                                <span style={{ fontSize: 12, color: '#666' }}>玩家意向：</span>
                                <Switch
                                  checked={willingness?.playerToGame || false}
                                  onChange={checked =>
                                    handlePlayerWillingnessChange(currentGame.id, player.id, checked)
                                  }
                                  checkedChildren={<HeartFilled style={{ color: '#eb2f96' }} />}
                                  unCheckedChildren={<HeartOutlined />}
                                />
                              </Space>
                            </Tooltip>
                            <Tooltip title={willingness?.gameToPlayer ? '撤回局方邀请' : '局方缺人邀请'}>
                              <Space>
                                <span style={{ fontSize: 12, color: '#666' }}>局方意向：</span>
                                <Switch
                                  checked={willingness?.gameToPlayer || false}
                                  onChange={checked =>
                                    handleGameWillingnessChange(currentGame.id, player.id, checked)
                                  }
                                  checkedChildren={<StarOutlined style={{ color: '#faad14' }} />}
                                  unCheckedChildren={<StarOutlined />}
                                />
                              </Space>
                            </Tooltip>
                          </div>
                        </div>
                      </List.Item>
                    )
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {mode === 'player' && currentPlayer && (
        <Card
          title={`为 ${currentPlayer.name} 推荐拼场局`}
          bordered={false}
        >
          {rankedGames.length === 0 ? (
            <Empty description="暂无可推荐的拼场局" />
          ) : (
            <Row gutter={[16, 16]}>
              {rankedGames.map(({ game, score, description }) => {
                const script = scripts.find(s => s.id === game.scriptId)
                const willingness = getWillingness(game.id, currentPlayer.id)
                return (
                  <Col xs={24} md={12} key={game.id}>
                    <Card
                      hoverable
                      size="small"
                      style={{ height: '100%' }}
                      title={
                        <Space>
                          <strong>{game.scriptName}</strong>
                          <Tag
                            color={
                              score >= 0.8 ? 'green'
                                : score >= 0.5 ? 'orange'
                                : 'red'
                            }
                          >
                            {description}
                          </Tag>
                          {willingness?.status === '已同意' && (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              匹配成功
                            </Tag>
                          )}
                        </Space>
                      }
                      extra={<div className={renderScoreColor(score)} style={{ fontSize: 20, fontWeight: 600 }}>
                        {Math.round(score * 100)}%
                      </div>}
                    >
                      <div style={{ marginBottom: 8 }}>
                        {script?.themes.map(t => (
                          <Tag key={t} color="purple">{t}</Tag>
                        ))}
                        <Tag color="orange">{script?.difficulty}</Tag>
                      </div>
                      <p style={{ color: '#666', marginBottom: 4 }}>
                        🕐 {game.scheduledTime}
                      </p>
                      <p style={{ color: '#666', marginBottom: 8 }}>
                        👥 {game.currentPlayers}/{game.requiredPlayers}人 | ¥{script?.price}/人
                      </p>
                      <Progress
                        percent={Math.round((game.currentPlayers / game.requiredPlayers) * 100)}
                        size="small"
                        style={{ marginBottom: 12 }}
                      />
                      <Space>
                        <Tooltip title="玩家想玩">
                          <Button
                            type={willingness?.playerToGame ? 'primary' : 'default'}
                            icon={willingness?.playerToGame ? <HeartFilled /> : <HeartOutlined />}
                            onClick={() =>
                              handlePlayerWillingnessChange(game.id, currentPlayer.id, !willingness?.playerToGame)
                            }
                            danger={!willingness?.playerToGame}
                            ghost={willingness?.playerToGame}
                          >
                            {willingness?.playerToGame ? '已意向' : '我想玩'}
                          </Button>
                        </Tooltip>
                        <Tooltip title="局方是否需要">
                          <Button
                            type={willingness?.gameToPlayer ? 'primary' : 'default'}
                            icon={<StarOutlined />}
                            onClick={() =>
                              handleGameWillingnessChange(game.id, currentPlayer.id, !willingness?.gameToPlayer)
                            }
                          >
                            {willingness?.gameToPlayer ? '局方已邀' : '局方缺人'}
                          </Button>
                        </Tooltip>
                      </Space>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </Card>
      )}

      {showMatchResults && currentGame && currentScript && (
        <Card
          title="撮合结果详情"
          bordered={false}
          style={{ marginTop: 16 }}
          extra={
            <Button onClick={() => setShowMatchResults(false)}>收起</Button>
          }
        >
          <List
            dataSource={findMutualMatches(
              currentGame,
              currentScript,
              players,
              new Map(willingnessList.filter(w => w.gameId === currentGame.id).map(w => [w.playerId, w.playerToGame])),
              new Map(willingnessList.filter(w => w.gameId === currentGame.id).map(w => [w.playerId, w.gameToPlayer]))
            )}
            renderItem={item => {
              const p = players.find(pl => pl.id === item.playerId)
              return (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={p?.name || item.playerId}
                    description={item.reason}
                  />
                  <Space>
                    <span>{Math.round(item.matchScore * 100)}%</span>
                    {item.mutualWillingness ? (
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                    )}
                  </Space>
                </List.Item>
              )
            }}
          />
        </Card>
      )}
    </div>
  )
}

export default Matching
