import React, { useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  List,
  Avatar,
  message,
  Empty,
  Radio,
  Tooltip,
  Divider,
  Popover
} from 'antd'
import {
  ScheduleOutlined,
  UserOutlined,
  StarOutlined,
  CheckCircleOutlined,
  CoffeeOutlined,
  PlusOutlined,
  MinusOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAppStore } from '../store/useAppStore'
import type { DMSchedule, GameSession, DM } from '../types'
import {
  getAvailableDMs,
  assignDMToGame,
  unassignDMFromGame,
  getDMScheduleStats,
  recommendDMForGame
} from '../modules/dmSchedule'

const timeSlots = ['10:00', '14:00', '19:00']

const DMSchedulePage: React.FC = () => {
  const {
    dms,
    gameSessions,
    scripts,
    dmSchedules,
    updateGameSession,
    batchUpdateDMSchedules
  } = useAppStore()

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [selectedDMId, setSelectedDMId] = useState<string | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<GameSession | null>(null)
  const [viewStartDate, setViewStartDate] = useState(dayjs().format('YYYY-MM-DD'))

  const dates = useMemo(() => {
    const result: string[] = []
    for (let i = 0; i < 7; i++) {
      result.push(dayjs(viewStartDate).add(i, 'day').format('YYYY-MM-DD'))
    }
    return result
  }, [viewStartDate])

  const gamesNeedingDM = gameSessions.filter(
    g => !g.dmId && (g.status === '招募中' || g.status === '已成团')
  )

  const handleOpenAssignModal = (game: GameSession) => {
    setSelectedGame(game)
    setAssignModalOpen(true)
  }

  const handleAssignDM = (dmId: string) => {
    if (!selectedGame) return
    const result = assignDMToGame(dmSchedules, dmId, selectedGame)
    if (!result.success) {
      message.error(result.message)
      return
    }
    batchUpdateDMSchedules(result.schedules)
    updateGameSession({ ...selectedGame, dmId })
    message.success('DM 安排成功')
    setAssignModalOpen(false)
    setSelectedGame(null)
  }

  const handleUnassignDM = (game: GameSession) => {
    if (!game.dmId) return
    Modal.confirm({
      title: '取消DM安排',
      content: `确定要取消该游戏的DM安排吗？`,
      onOk: () => {
        const updated = unassignDMFromGame(dmSchedules, game.id)
        batchUpdateDMSchedules(updated)
        updateGameSession({ ...game, dmId: undefined })
        message.success('已取消DM安排')
      }
    })
  }

  const renderScheduleCell = (date: string, slot: string, dmId: string) => {
    const schedule = dmSchedules.find(
      s => s.date === date && s.timeSlot === slot && s.dmId === dmId
    )

    if (!schedule) {
      return <Tag style={{ background: '#f5f5f5', border: 'none' }}>-</Tag>
    }

    const game = gameSessions.find(g => g.id === schedule.gameId)
    const colorMap: Record<string, string> = {
      '空闲': 'default',
      '已安排': 'green',
      '休息': 'orange'
    }
    const iconMap: Record<string, React.ReactNode> = {
      '空闲': <ClockCircleOutlined />,
      '已安排': <CheckCircleOutlined />,
      '休息': <CoffeeOutlined />
    }

    return (
      <Popover
        content={
          <div>
            <p style={{ margin: 0 }}>
              <strong>状态：</strong>{schedule.status}
            </p>
            {game && (
              <p style={{ margin: '4px 0 0 0' }}>
                <strong>主持局：</strong>{game.scriptName}
              </p>
            )}
          </div>
        }
        title={date + ' ' + slot}
      >
        <Tag color={colorMap[schedule.status]} icon={iconMap[schedule.status]}>
          {game ? game.scriptName.slice(0, 6) : schedule.status}
        </Tag>
      </Popover>
    )
  }

  const columns: ColumnsType<DM> = [
    {
      title: 'DM信息',
      key: 'info',
      width: 200,
      render: (_, dm) => (
        <Space>
          <Avatar size={40} icon={<UserOutlined />} style={{ background: '#722ed1' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{dm.name}</div>
            <div style={{ color: '#999', fontSize: 12 }}>{dm.phone}</div>
          </div>
        </Space>
      )
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <strong>{rating.toFixed(1)}</strong>
        </Space>
      ),
      sorter: (a, b) => a.rating - b.rating
    },
    {
      title: '擅长剧本',
      key: 'scripts',
      render: (_, dm) => (
        <Space wrap>
          {dm.skilledScripts.map(sid => {
            const script = scripts.find(s => s.id === sid)
            return script ? (
              <Tag key={sid} color="purple">{script.name}</Tag>
            ) : null
          })}
        </Space>
      )
    },
    {
      title: '本周排班统计',
      key: 'stats',
      width: 200,
      render: (_, dm) => {
        const stats = getDMScheduleStats(dmSchedules, dm.id)
        return (
          <Space size={4}>
            <Tag color="green">已安排 {stats.arranged}</Tag>
            <Tag>空闲 {stats.free}</Tag>
            <Tag color="orange">休息 {stats.rest}</Tag>
          </Space>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, dm) => (
        <Button
          size="small"
          onClick={() => setSelectedDMId(dm.id)}
          type={selectedDMId === dm.id ? 'primary' : 'default'}
        >
          查看排班
        </Button>
      )
    }
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ color: '#666', marginBottom: 4 }}>DM总数</div>
                <div style={{ fontSize: 28, fontWeight: 600 }}>{dms.length} 位</div>
              </div>
              <div>
                <div style={{ color: '#666', marginBottom: 4 }}>平均评分</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: '#faad14' }}>
                  <StarOutlined /> {' '}
                  {(dms.reduce((s, d) => s + d.rating, 0) / Math.max(dms.length, 1)).toFixed(1)}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', marginBottom: 4 }}>待安排DM的局</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: '#ff4d4f' }}>
                  {gamesNeedingDM.length} 场
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            title="待安排DM的局"
            bordered={false}
            extra={
              <Radio.Group
                value={viewMode}
                onChange={e => setViewMode(e.target.value)}
                optionType="button"
                size="small"
              >
                <Radio.Button value="list">列表</Radio.Button>
                <Radio.Button value="calendar">排班表</Radio.Button>
              </Radio.Group>
            }
          >
            {gamesNeedingDM.length === 0 ? (
              <Empty description="所有局都已安排DM" />
            ) : (
              <List
                grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                dataSource={gamesNeedingDM}
                renderItem={game => {
                  const script = scripts.find(s => s.id === game.scriptId)
                  return (
                    <List.Item>
                      <Card
                        size="small"
                        hoverable
                        style={{ height: '100%' }}
                        actions={[
                          <Button
                            type="primary"
                            size="small"
                            icon={<ScheduleOutlined />}
                            onClick={() => handleOpenAssignModal(game)}
                          >
                            安排DM
                          </Button>
                        ]}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{game.scriptName}</div>
                        <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>
                          🕐 {game.scheduledTime}
                        </div>
                        <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>
                          👥 {game.currentPlayers}/{game.requiredPlayers} | ¥{script?.price}/人
                        </div>
                        <Tag color="orange">待安排DM</Tag>
                      </Card>
                    </List.Item>
                  )
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="DM列表"
        bordered={false}
        extra={
          <Space>
            <Button
              icon={<MinusOutlined />}
              onClick={() => setViewStartDate(dayjs(viewStartDate).subtract(7, 'day').format('YYYY-MM-DD'))}
            />
            <span style={{ color: '#666' }}>
              {dates[0]} ~ {dates[dates.length - 1]}
            </span>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setViewStartDate(dayjs(viewStartDate).add(7, 'day').format('YYYY-MM-DD'))}
            />
          </Space>
        }
      >
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={dms}
            rowKey="id"
            pagination={false}
            expandable={{
              expandedRowRender: dm => {
                const stats = getDMScheduleStats(dmSchedules, dm.id)
                const dmScheduled = dmSchedules.filter(
                  s => s.dmId === dm.id && s.status === '已安排'
                )
                return (
                  <div>
                    <Divider orientation="left">详细统计</Divider>
                    <Row gutter={[24, 12]}>
                      <Col span={6}>
                        <div style={{ color: '#999' }}>总排班数</div>
                        <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.total}</div>
                      </Col>
                      <Col span={6}>
                        <div style={{ color: '#999' }}>已安排</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
                          {stats.arranged}
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{ color: '#999' }}>空闲</div>
                        <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.free}</div>
                      </Col>
                      <Col span={6}>
                        <div style={{ color: '#999' }}>休息</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#faad14' }}>
                          {stats.rest}
                        </div>
                      </Col>
                    </Row>
                    {dmScheduled.length > 0 && (
                      <>
                        <Divider orientation="left">已安排的场次</Divider>
                        <List
                          size="small"
                          dataSource={dmScheduled}
                          renderItem={s => {
                            const game = gameSessions.find(g => g.id === s.gameId)
                            return (
                              <List.Item>
                                <ScheduleOutlined style={{ color: '#52c41a' }} />
                                <span style={{ marginLeft: 8 }}>
                                  {s.date} {s.timeSlot} - {game?.scriptName || s.gameId}
                                </span>
                              </List.Item>
                            )
                          }}
                        />
                      </>
                    )}
                  </div>
                )
              }
            }}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 8px', borderBottom: '2px solid #f0f0f0', textAlign: 'left', minWidth: 150 }}>
                    DM
                  </th>
                  {dates.map(date => (
                    <th
                      key={date}
                      colSpan={timeSlots.length}
                      style={{
                        padding: '12px 8px',
                        borderBottom: '2px solid #f0f0f0',
                        textAlign: 'center',
                        background: dayjs(date).isSame(dayjs(), 'day') ? '#f9f0ff' : undefined
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {date}
                        {dayjs(date).isSame(dayjs(), 'day') && (
                          <Tag color="purple" style={{ marginLeft: 8 }}>今天</Tag>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
                        {timeSlots.map(slot => (
                          <span key={slot} style={{ fontSize: 12, color: '#999' }}>{slot}</span>
                        ))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dms.map(dm => (
                  <tr key={dm.id}>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <Avatar size={32} icon={<UserOutlined />} style={{ background: '#722ed1' }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{dm.name}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            ⭐ {dm.rating.toFixed(1)}
                          </div>
                        </div>
                      </Space>
                    </td>
                    {dates.map(date =>
                      timeSlots.map(slot => (
                        <td
                          key={`${date}-${slot}`}
                          style={{
                            padding: '8px',
                            borderBottom: '1px solid #f0f0f0',
                            textAlign: 'center'
                          }}
                        >
                          {renderScheduleCell(date, slot, dm.id)}
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, display: 'flex', gap: 16, color: '#666', fontSize: 12 }}>
              <Tag>空闲</Tag>
              <Tag color="green">已安排</Tag>
              <Tag color="orange">休息</Tag>
            </div>
          </div>
        )}
      </Card>

      <Modal
        title={`为 "${selectedGame?.scriptName}" 安排DM`}
        open={assignModalOpen}
        onCancel={() => {
          setAssignModalOpen(false)
          setSelectedGame(null)
        }}
        footer={null}
        width={560}
      >
        {selectedGame && (() => {
          const script = scripts.find(s => s.id === selectedGame.scriptId)
          const [datePart, timePart] = selectedGame.scheduledTime.split(' ')
          const hour = parseInt(timePart.split(':')[0])
          const slot = hour < 12 ? '10:00' : hour < 17 ? '14:00' : '19:00'
          const available = script
            ? recommendDMForGame(dms, dmSchedules, selectedGame, script)
            : getAvailableDMs(dms, dmSchedules, datePart, slot, script?.id).map(({ dm, isSkilled }) => ({
                dm,
                score: isSkilled ? 80 : 50,
                reason: isSkilled ? '擅长此剧本' : '可排班'
              }))

          if (available.length === 0) {
            return <Empty description="该时段没有可用的DM" />
          }

          return (
            <List
              dataSource={available}
              renderItem={({ dm, score, reason }) => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      onClick={() => handleAssignDM(dm.id)}
                    >
                      选择
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} style={{ background: '#722ed1' }} />}
                    title={
                      <Space>
                        <strong>{dm.name}</strong>
                        <Tag color="purple">推荐指数 {score}</Tag>
                        <Tag color="orange">⭐ {dm.rating.toFixed(1)}</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Tag color="green">{reason}</Tag>
                        <span style={{ color: '#999' }}>
                          擅长剧本：{dm.skilledScripts
                            .map(sid => scripts.find(s => s.id === sid)?.name)
                            .filter(Boolean)
                            .join('、') || '无'}
                        </span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )
        })()}
      </Modal>
    </Space>
  )
}

export default DMSchedulePage
