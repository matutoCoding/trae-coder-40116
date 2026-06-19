import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Avatar,
  Progress,
  Divider,
  Select,
  Table,
  List,
  Modal,
  message,
  Typography,
  Popconfirm,
  Tooltip,
  Empty,
  Statistic
} from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  StarOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  ReloadOutlined,
  PrinterOutlined,
  HeartOutlined,
  TeamOutlined,
  MoneyCollectOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAppStore } from '../store/useAppStore'
import type { Bill, DiscountCoupon } from '../types'
import {
  assignDMToGame,
  unassignDMFromGame,
  recommendDMForGame
} from '../modules/dmSchedule'
import { generateBill, markBillPaid, markBillRefunded, formatBillText, calculateGameTotalRevenue } from '../modules/billing'

const { Title, Text } = Typography

const GameDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    gameSessions,
    scripts,
    players,
    dms,
    dmSchedules,
    coupons,
    bills,
    discountOrder,
    updateGameSession,
    batchUpdateDMSchedules,
    addBills,
    updateBill,
    removeBillsByGame
  } = useAppStore()

  const game = gameSessions.find(g => g.id === id)
  const script = game ? scripts.find(s => s.id === game.scriptId) : null

  const [dmModalOpen, setDmModalOpen] = useState(false)
  const [billModalOpen, setBillModalOpen] = useState(false)
  const [playerCouponMap, setPlayerCouponMap] = useState<Record<string, string[]>>({})
  const [billDetail, setBillDetail] = useState<Bill | null>(null)

  const gameBills = useMemo(
    () => bills.filter(b => b.id && b.gameId === id),
    [bills, id]
  )

  const revenue = useMemo(() => calculateGameTotalRevenue(gameBills), [gameBills])

  const dmInfo = useMemo(() => {
    if (!game?.dmId) return null
    return dms.find(d => d.id === game.dmId) || null
  }, [game, dms])

  if (!game || !script) {
    return (
      <Card>
        <Empty description="未找到该拼场局">
          <Button onClick={() => navigate('/games')}>返回拼场局列表</Button>
        </Empty>
      </Card>
    )
  }

  const handleAssignDM = (dmId: string) => {
    const result = assignDMToGame(dmSchedules, dmId, game)
    if (!result.success) {
      message.error(result.message)
      return
    }
    batchUpdateDMSchedules(result.schedules)
    updateGameSession({ ...game, dmId })
    message.success('DM 安排成功')
    setDmModalOpen(false)
  }

  const handleUnassignDM = () => {
    if (!game.dmId) return
    Modal.confirm({
      title: '取消DM安排',
      content: '确定要取消该游戏的DM安排吗？',
      onOk: () => {
        const updated = unassignDMFromGame(dmSchedules, game.id)
        batchUpdateDMSchedules(updated)
        updateGameSession({ ...game, dmId: undefined })
        message.success('已取消DM安排')
      }
    })
  }

  const openBillModal = () => {
    const initMap: Record<string, string[]> = {}
    game.playerIds.forEach(pid => {
      initMap[pid] = []
    })
    setPlayerCouponMap(initMap)
    setBillModalOpen(true)
  }

  const handleGenerateBills = () => {
    const existingPaidPlayerIds = gameBills
      .filter(b => b.paymentStatus === '已支付')
      .map(b => b.playerId)

    const playersToBill = players.filter(
      p => game.playerIds.includes(p.id) && !existingPaidPlayerIds.includes(p.id)
    )

    if (playersToBill.length === 0) {
      message.warning('所有玩家均已生成账单或已支付')
      return
    }

    const newBills: Bill[] = []
    playersToBill.forEach(player => {
      const couponIds = playerCouponMap[player.id] || []
      const selectedCoupons = coupons.filter(c => couponIds.includes(c.id))
      const bill = generateBill(game, player, script, selectedCoupons, discountOrder)
      newBills.push(bill)
    })

    removeBillsByGame(game.id)
    addBills(newBills)
    message.success(`已为 ${newBills.length} 位玩家生成账单`)
    setBillModalOpen(false)
  }

  const handleMarkPaid = (bill: Bill) => {
    updateBill(markBillPaid(bill))
    message.success('已确认支付')
  }

  const handleRefund = (bill: Bill) => {
    Modal.confirm({
      title: '确认退款',
      content: `退款金额：¥${bill.finalAmount.toFixed(2)}`,
      onOk: () => {
        updateBill(markBillRefunded(bill))
        message.success('已退款')
      }
    })
  }

  const handlePrintBill = (bill: Bill) => {
    const player = players.find(p => p.id === bill.playerId)
    const text = formatBillText(bill, player?.name || '-', game.scriptName)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<pre style="font-family:monospace;padding:20px;white-space:pre-wrap;">${text}</pre>`)
      w.document.close()
      w.print()
    }
  }

  const billColumns: ColumnsType<Bill> = [
    {
      title: '玩家',
      key: 'player',
      render: (_, r) => players.find(p => p.id === r.playerId)?.name || r.playerId
    },
    {
      title: '原价',
      dataIndex: 'originalAmount',
      render: (v) => `¥${v.toFixed(2)}`
    },
    {
      title: '优惠明细',
      key: 'discounts',
      render: (_, r) => {
        if (r.discountDetails.length === 0) return <Tag>无优惠</Tag>
        return (
          <Space direction="vertical" size={2}>
            {r.discountDetails.map(d => (
              <div key={d.couponId}>
                <Tag color={d.type === 'coupon' ? 'purple' : 'orange'}>
                  {d.type === 'coupon' ? '折扣' : '满减'}
                </Tag>
                <Text style={{ fontSize: 12 }}>{d.couponName}</Text>
                <Text type="success" style={{ fontSize: 12, marginLeft: 4 }}>
                  -¥{d.discountAmount.toFixed(2)}
                </Text>
              </div>
            ))}
          </Space>
        )
      }
    },
    {
      title: '实付',
      dataIndex: 'finalAmount',
      render: (v) => <Text strong style={{ color: '#722ed1' }}>¥{v.toFixed(2)}</Text>
    },
    {
      title: '状态',
      dataIndex: 'paymentStatus',
      render: (s) => {
        const cm: Record<string, string> = { '待支付': 'orange', '已支付': 'green', '已退款': 'default' }
        return <Tag color={cm[s]}>{s}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => setBillDetail(r)}>详情</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintBill(r)}>打印</Button>
          {r.paymentStatus === '待支付' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleMarkPaid(r)}>收款</Button>
          )}
          {r.paymentStatus === '已支付' && (
            <Popconfirm title="确认退款？" onConfirm={() => handleRefund(r)}>
              <Button size="small" danger icon={<ReloadOutlined />}>退款</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  const dmRecommendations = useMemo(() => {
    if (!game || !script) return []
    return recommendDMForGame(dms, dmSchedules, game, script)
  }, [game, script, dms, dmSchedules])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/games')}>返回</Button>
              <Title level={4} style={{ margin: 0 }}>{game.scriptName}</Title>
              <Tag color={
                game.status === '招募中' ? 'blue'
                  : game.status === '已成团' ? 'green'
                  : game.status === '进行中' ? 'orange'
                  : 'default'
              }>
                {game.status}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              {game.status === '招募中' && (
                <Button
                  type="primary"
                  icon={<HeartOutlined />}
                  onClick={() => {
                    navigate('/matching')
                  }}
                >
                  去撮合玩家
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="基本信息" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div><Text type="secondary">剧本：</Text><strong>{game.scriptName}</strong></div>
              <div>
                <Text type="secondary">题材：</Text>
                {script.themes.map(t => <Tag key={t} color="purple">{t}</Tag>)}
                <Tag color="orange">{script.difficulty}</Tag>
              </div>
              <div><Text type="secondary">开场时间：</Text>{game.scheduledTime}</div>
              <div><Text type="secondary">房间：</Text>{game.room || '待定'}</div>
              <div><Text type="secondary">单价：</Text><strong style={{ color: '#722ed1' }}>¥{script.price}/人</strong></div>
              <div>
                <Text type="secondary">人数：</Text>
                <strong>{game.currentPlayers} / {game.requiredPlayers}</strong>
                <Progress
                  percent={Math.round((game.currentPlayers / game.requiredPlayers) * 100)}
                  size="small"
                  style={{ marginTop: 8 }}
                  status={game.currentPlayers >= game.requiredPlayers ? 'success' : 'active'}
                />
              </div>
              {game.note && <div><Text type="secondary">备注：</Text>{game.note}</div>}
            </Space>
          </Card>

          <Card title="DM安排" bordered={false} style={{ marginTop: 16 }}>
            {dmInfo ? (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <Avatar icon={<UserOutlined />} style={{ background: '#722ed1' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{dmInfo.name}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>⭐ {dmInfo.rating.toFixed(1)}</div>
                  </div>
                  <Tag color="green">已安排</Tag>
                </Space>
                <div>
                  <Button size="small" danger onClick={handleUnassignDM}>取消安排</Button>
                </div>
              </div>
            ) : (
              <div>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未安排DM" />
                <Button
                  type="primary"
                  icon={<ScheduleOutlined />}
                  block
                  onClick={() => setDmModalOpen(true)}
                  style={{ marginTop: 8 }}
                >
                  安排DM
                </Button>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>本局玩家</span>
                <Tag color="blue">{game.playerIds.length} 人</Tag>
              </Space>
            }
            bordered={false}
          >
            {game.playerIds.length === 0 ? (
              <Empty description="暂无玩家" />
            ) : (
              <List
                grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                dataSource={game.playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as typeof players}
                renderItem={player => {
                  const playerBill = gameBills.find(b => b.playerId === player.id)
                  return (
                    <List.Item>
                      <Card size="small" hoverable>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space>
                            <Avatar size={32} icon={<UserOutlined />} style={{ background: '#722ed1' }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{player.name}</div>
                              <div style={{ fontSize: 12, color: '#999' }}>
                                {player.preferredThemes.slice(0, 3).map(t => (
                                  <Tag key={t} style={{ fontSize: 11, padding: '0 4px' }}>{t}</Tag>
                                ))}
                              </div>
                            </div>
                            {player.id === game.hostPlayerId && <Tag color="gold">发起</Tag>}
                          </Space>
                          {playerBill ? (
                            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>账单：</Text>
                                <Tag color={playerBill.paymentStatus === '已支付' ? 'green' : 'orange'}>
                                  {playerBill.paymentStatus}
                                </Tag>
                              </div>
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>实付：</Text>
                                <strong style={{ color: '#722ed1' }}>¥{playerBill.finalAmount.toFixed(2)}</strong>
                              </div>
                            </div>
                          ) : (
                            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                              <Tag>未生成账单</Tag>
                            </div>
                          )}
                        </Space>
                      </Card>
                    </List.Item>
                  )
                }}
              />
            )}
          </Card>

          <Card
            title={
              <Space>
                <MoneyCollectOutlined />
                <span>收款管理</span>
              </Space>
            }
            bordered={false}
            style={{ marginTop: 16 }}
            extra={
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={openBillModal}
              >
                {gameBills.length > 0 ? '重新生成账单' : '生成账单'}
              </Button>
            }
          >
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic title="已出账单" value={`${gameBills.length}/${game.playerIds.length}`} />
              </Col>
              <Col span={6}>
                <Statistic title="原价合计" value={revenue.totalOriginal} prefix="¥" precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="优惠合计" value={revenue.totalDiscount} prefix="-¥" precision={2} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="实收金额" value={revenue.totalFinal} prefix="¥" precision={2} valueStyle={{ color: '#722ed1' }} />
              </Col>
            </Row>
            {gameBills.length === 0 ? (
              <Empty description="暂无账单，点击右上角生成" />
            ) : (
              <Table
                columns={billColumns}
                dataSource={gameBills}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="安排DM"
        open={dmModalOpen}
        onCancel={() => setDmModalOpen(false)}
        footer={null}
        width={520}
      >
        {dmRecommendations.length === 0 ? (
          <Empty description="该时段没有可用的DM" />
        ) : (
          <List
            dataSource={dmRecommendations}
            renderItem={({ dm, score, reason }) => (
              <List.Item
                actions={[
                  <Button type="primary" onClick={() => handleAssignDM(dm.id)}>选择</Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ background: '#722ed1' }} />}
                  title={
                    <Space>
                      <strong>{dm.name}</strong>
                      <Tag color="purple">推荐 {score}</Tag>
                      <Tag color="orange">⭐ {dm.rating.toFixed(1)}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Tag color="green">{reason}</Tag>
                      <span style={{ color: '#999', fontSize: 12 }}>
                        擅长：{dm.skilledScripts.map(sid => scripts.find(s => s.id === sid)?.name).filter(Boolean).join('、') || '无'}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

      <Modal
        title="生成账单 — 按玩家选择优惠"
        open={billModalOpen}
        onCancel={() => setBillModalOpen(false)}
        onOk={handleGenerateBills}
        okText="确认生成"
        width={700}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            为每位玩家选择要使用的优惠券组合，不选则按原价计费。
            已支付的账单不会被覆盖。
          </Text>
        </div>
        <List
          dataSource={game.playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as typeof players}
          renderItem={player => {
            const existingBill = gameBills.find(b => b.playerId === player.id && b.paymentStatus === '已支付')
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ background: '#722ed1' }} />}
                  title={
                    <Space>
                      <strong>{player.name}</strong>
                      <Tag>¥{script.price}</Tag>
                      {existingBill && <Tag color="green">已支付（跳过）</Tag>}
                    </Space>
                  }
                  description={
                    existingBill ? null : (
                      <Select
                        mode="multiple"
                        placeholder="选择优惠券（可不选）"
                        style={{ width: '100%', marginTop: 4 }}
                        value={playerCouponMap[player.id] || []}
                        onChange={(vals) =>
                          setPlayerCouponMap(prev => ({ ...prev, [player.id]: vals }))
                        }
                        options={coupons.map(c => ({
                          label: `${c.name} (${c.type === 'coupon'
                            ? `${(c.discountRate! * 10).toFixed(1)}折`
                            : `满${c.threshold}减${c.discountAmount}`})`,
                          value: c.id
                        }))}
                      />
                    )
                  }
                />
              </List.Item>
            )
          }}
        />
      </Modal>

      <Modal
        title="账单详情"
        open={!!billDetail}
        onCancel={() => setBillDetail(null)}
        footer={
          billDetail ? (
            <Space>
              <Button icon={<PrinterOutlined />} onClick={() => handlePrintBill(billDetail)}>打印</Button>
              {billDetail.paymentStatus === '待支付' && (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => { handleMarkPaid(billDetail); setBillDetail(null) }}>
                  确认收款
                </Button>
              )}
              <Button onClick={() => setBillDetail(null)}>关闭</Button>
            </Space>
          ) : null
        }
        width={480}
      >
        {billDetail && (() => {
          const player = players.find(p => p.id === billDetail.playerId)
          return (
            <pre style={{
              fontFamily: 'monospace',
              background: '#fafafa',
              padding: 16,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {formatBillText(billDetail, player?.name || '-', game.scriptName)}
            </pre>
          )
        })()}
      </Modal>
    </Space>
  )
}

export default GameDetail
