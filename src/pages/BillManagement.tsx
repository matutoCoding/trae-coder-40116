import React, { useState, useMemo } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Select,
  message,
  Empty,
  Row,
  Col,
  Statistic,
  Typography,
  List,
  Avatar,
  InputNumber,
  DatePicker,
  Divider,
  Progress,
  Popconfirm,
  Input
} from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  PrinterOutlined,
  MoneyCollectOutlined,
  PlusOutlined,
  DownloadOutlined,
  UserOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAppStore } from '../store/useAppStore'
import type { Bill, PaymentRecord } from '../types'
import {
  generateBill,
  markBillPaid,
  markBillRefunded,
  addPayment,
  formatBillText,
  calculateGameTotalRevenue
} from '../modules/billing'
import { exportPlayersCSV, exportGamesCSV, exportBillsCSV } from '../modules/export'
import dayjs from 'dayjs'

const { Text } = Typography

const BillManagement: React.FC = () => {
  const {
    bills,
    gameSessions,
    players,
    scripts,
    coupons,
    discountOrder,
    addBills,
    updateBill,
    removeBillsByGame
  } = useAppStore()

  const [showBillDetail, setShowBillDetail] = useState<Bill | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [playerCouponMap, setPlayerCouponMap] = useState<Record<string, string[]>>({})
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [currentPaymentBill, setCurrentPaymentBill] = useState<Bill | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentType, setPaymentType] = useState<PaymentRecord['type']>('定金')
  const [paymentNote, setPaymentNote] = useState('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  const stats = useMemo(() => {
    const paid = bills.filter(b => b.paymentStatus === '已支付')
    const partial = bills.filter(b => b.paymentStatus === '部分支付')
    const unpaid = bills.filter(b => b.paymentStatus === '待支付')
    const paidTotal = paid.reduce((s, b) => s + b.paidAmount, 0)
    const partialTotal = partial.reduce((s, b) => s + b.paidAmount, 0)
    const unpaidTotal = unpaid.reduce((s, b) => s + b.finalAmount, 0)
      + partial.reduce((s, b) => s + (b.finalAmount - b.paidAmount), 0)
    return {
      totalBills: bills.length,
      paidAmount: paidTotal + partialTotal,
      unpaidAmount: unpaidTotal,
      totalDiscount: bills.reduce(
        (s, b) => s + b.discountDetails.reduce((ds, d) => ds + d.discountAmount, 0),
        0
      )
    }
  }, [bills])

  const completeGames = gameSessions.filter(
    g => g.status === '已成团' || g.status === '进行中' || g.status === '已结束'
  )

  const currentGame = useMemo(
    () => gameSessions.find(g => g.id === selectedGameId),
    [gameSessions, selectedGameId]
  )
  const currentScript = useMemo(
    () => (currentGame ? scripts.find(s => s.id === currentGame.scriptId) : null),
    [currentGame, scripts]
  )

  const gameBills = useMemo(
    () => bills.filter(b => b.gameId === selectedGameId),
    [bills, selectedGameId]
  )

  const gameStats = useMemo(() => {
    if (!selectedGameId || !currentGame) return null
    return {
      game: currentGame,
      ...calculateGameTotalRevenue(gameBills),
      billCount: gameBills.length
    }
  }, [selectedGameId, currentGame, gameBills])

  const filteredBills = useMemo(() => {
    let list = bills
    if (selectedGameId) {
      list = list.filter(b => b.gameId === selectedGameId)
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0]
      const end = dateRange[1]
      list = list.filter(b => {
        const t = dayjs(b.createdAt)
        return t.isAfter(start.subtract(1, 'day')) && t.isBefore(end.add(1, 'day'))
      })
    }
    return list
  }, [bills, selectedGameId, dateRange])

  const openGenerateModal = () => {
    if (!currentGame) return
    const initMap: Record<string, string[]> = {}
    currentGame.playerIds.forEach(pid => {
      initMap[pid] = []
    })
    setPlayerCouponMap(initMap)
    setIsGenerateModalOpen(true)
  }

  const handleGenerateBills = () => {
    if (!currentGame || !currentScript) return

    const existingPaidPlayerIds = gameBills
      .filter(b => b.paymentStatus === '已支付' || b.paymentStatus === '部分支付')
      .map(b => b.playerId)

    const playersToBill = players.filter(
      p => currentGame.playerIds.includes(p.id) && !existingPaidPlayerIds.includes(p.id)
    )

    if (playersToBill.length === 0) {
      message.warning('所有玩家均已生成账单或已收款，已收款账单无法重算')
      return
    }

    const newBills: Bill[] = []
    playersToBill.forEach(player => {
      const couponIds = playerCouponMap[player.id] || []
      const selectedCoupons = coupons.filter(c => couponIds.includes(c.id))
      const bill = generateBill(currentGame, player, currentScript, selectedCoupons, discountOrder, false)
      newBills.push(bill)
    })

    removeBillsByGame(currentGame.id)
    addBills(newBills)
    message.success(`已为 ${newBills.length} 位玩家生成/重算账单`)
    setIsGenerateModalOpen(false)
  }

  const openPaymentModal = (bill: Bill) => {
    setCurrentPaymentBill(bill)
    setPaymentAmount(Math.max(0, bill.finalAmount - bill.paidAmount))
    setPaymentType('定金')
    setPaymentNote('')
    setPaymentModalOpen(true)
  }

  const handleAddPayment = () => {
    if (!currentPaymentBill) return
    if (!paymentAmount || paymentAmount <= 0) {
      message.warning('请输入收款金额')
      return
    }
    const remain = currentPaymentBill.finalAmount - currentPaymentBill.paidAmount
    if (paymentAmount > remain + 0.001) {
      message.warning(`收款金额不能超过待收金额 ¥${remain.toFixed(2)}`)
      return
    }
    const updated = addPayment(currentPaymentBill, paymentAmount, paymentType, paymentNote || undefined)
    updateBill(updated)
    message.success('收款成功')
    setPaymentModalOpen(false)
  }

  const handleMarkPaid = (bill: Bill) => {
    updateBill(markBillPaid(bill))
    message.success('账单已标记为已支付')
  }

  const handleMarkRefunded = (bill: Bill) => {
    Modal.confirm({
      title: '确认退款',
      content: `确定要将此账单标记为已退款吗？金额：¥${bill.finalAmount.toFixed(2)}`,
      okText: '确认退款',
      cancelText: '取消',
      onOk: () => {
        updateBill(markBillRefunded(bill))
        message.success('账单已标记为已退款')
      }
    })
  }

  const handlePrintBill = (bill: Bill) => {
    const player = players.find(p => p.id === bill.playerId)
    const game = gameSessions.find(g => g.id === bill.gameId)
    if (!player || !game) return
    const text = formatBillText(bill, player.name, game.scriptName)

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(
        `<pre style="font-family: monospace; padding: 20px; white-space: pre-wrap;">${text}</pre>`
      )
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleExport = (type: 'players' | 'games' | 'bills') => {
    let content = ''
    let filename = ''
    if (type === 'players') {
      content = exportPlayersCSV(players)
      filename = `玩家名单_${dayjs().format('YYYYMMDD')}.csv`
    } else if (type === 'games') {
      let gameList = gameSessions
      if (dateRange && dateRange[0] && dateRange[1]) {
        gameList = gameSessions.filter(g => {
          const t = dayjs(g.scheduledTime)
          return t.isAfter(dateRange[0]!.subtract(1, 'day')) && t.isBefore(dateRange[1]!.add(1, 'day'))
        })
      }
      content = exportGamesCSV(gameList, players)
      filename = `拼场局_${dayjs().format('YYYYMMDD')}.csv`
    } else {
      content = exportBillsCSV(filteredBills, players, gameSessions)
      filename = `账单明细_${dayjs().format('YYYYMMDD')}.csv`
    }

    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    message.success(`${filename} 导出成功`)
  }

  const columns: ColumnsType<Bill> = [
    {
      title: '账单编号',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (id) => <Text code style={{ fontSize: 12 }}>{id}</Text>
    },
    {
      title: '玩家',
      key: 'player',
      width: 100,
      render: (_, record) => {
        const player = players.find(p => p.id === record.playerId)
        return player?.name || record.playerId
      }
    },
    {
      title: '剧本/局',
      key: 'game',
      width: 150,
      render: (_, record) => {
        const game = gameSessions.find(g => g.id === record.gameId)
        return game?.scriptName || record.gameId
      }
    },
    {
      title: '原价',
      dataIndex: 'originalAmount',
      key: 'originalAmount',
      width: 90,
      render: (amt) => `¥${amt.toFixed(2)}`
    },
    {
      title: '优惠',
      key: 'discount',
      width: 120,
      render: (_, record) => {
        const total = record.discountDetails.reduce((s, d) => s + d.discountAmount, 0)
        return total > 0 ? (
          <Tag color="green">-¥{total.toFixed(2)} ({record.discountDetails.length}项)</Tag>
        ) : <Tag>无</Tag>
      }
    },
    {
      title: '应收',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      width: 90,
      render: (amt) => <Text strong>¥{amt.toFixed(2)}</Text>
    },
    {
      title: '已收/待收',
      key: 'paid',
      width: 160,
      render: (_, r) => {
        const remain = Math.max(0, r.finalAmount - r.paidAmount)
        return (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <div>
              <Text type="success" style={{ fontSize: 12 }}>已收: ¥{r.paidAmount.toFixed(2)}</Text>
            </div>
            <div>
              <Text type="danger" style={{ fontSize: 12 }}>待收: ¥{remain.toFixed(2)}</Text>
            </div>
            <Progress
              percent={Math.round((r.paidAmount / r.finalAmount) * 100)}
              size="small"
              showInfo={false}
              style={{ marginTop: 2 }}
            />
          </Space>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 90,
      render: (status) => {
        const colorMap: Record<string, string> = {
          '待支付': 'orange',
          '部分支付': 'blue',
          '已支付': 'green',
          '已退款': 'default'
        }
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
      },
      filters: [
        { text: '待支付', value: '待支付' },
        { text: '部分支付', value: '部分支付' },
        { text: '已支付', value: '已支付' },
        { text: '已退款', value: '已退款' }
      ],
      onFilter: (value, record) => record.paymentStatus === value
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => setShowBillDetail(record)}>详情</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintBill(record)}>打印</Button>
          {(record.paymentStatus === '待支付' || record.paymentStatus === '部分支付') && (
            <Button size="small" icon={<PlusOutlined />} onClick={() => openPaymentModal(record)}>收款</Button>
          )}
          {record.paymentStatus === '待支付' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleMarkPaid(record)}>全款</Button>
          )}
          {record.paymentStatus === '已支付' && (
            <Popconfirm title="确认退款？" onConfirm={() => handleMarkRefunded(record)}>
              <Button size="small" danger icon={<ReloadOutlined />}>退款</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="账单总数"
              value={stats.totalBills}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="已收金额"
              value={stats.paidAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="待收金额"
              value={stats.unpaidAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="优惠总额"
              value={stats.totalDiscount}
              precision={2}
              prefix="-¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="数据导出"
        bordered={false}
        size="small"
        extra={
          <Space>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(vals) => setDateRange(vals as any)}
              placeholder={['开始日期', '结束日期']}
            />
          </Space>
        }
      >
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('players')}>
            导出玩家名单
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('games')}>
            导出拼场局
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('bills')}>
            导出账单明细
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            选日期范围可按日期过滤，不选则导出全部
          </Text>
        </Space>
      </Card>

      {gameStats && (
        <Card
          title={`局：${gameStats.game.scriptName} - 统计`}
          bordered={false}
          extra={
            <Space>
              <Button onClick={() => setSelectedGameId(null)}>取消筛选</Button>
              <Button type="primary" icon={<MoneyCollectOutlined />} onClick={openGenerateModal}>
                {gameBills.length > 0 ? '重算未支付账单' : '生成账单'}
              </Button>
            </Space>
          }
          style={{ borderLeft: '4px solid #722ed1' }}
        >
          <Row gutter={[24, 12]}>
            <Col span={6}>
              <Text type="secondary">已生成账单</Text>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {gameStats.billCount} / {gameStats.game.playerIds.length}
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">原价合计</Text>
              <div style={{ fontSize: 24, fontWeight: 600 }}>¥{gameStats.totalOriginal.toFixed(2)}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">优惠合计</Text>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>
                -¥{gameStats.totalDiscount.toFixed(2)}
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">应收金额</Text>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#722ed1' }}>
                ¥{gameStats.totalFinal.toFixed(2)}
              </div>
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Row gutter={[24, 12]}>
            <Col span={8}>
              <Text type="secondary">已收</Text>
              <div style={{ fontWeight: 600, color: '#52c41a', fontSize: 18 }}>
                ¥{gameStats.totalPaid.toFixed(2)}
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">待收</Text>
              <div style={{ fontWeight: 600, color: '#fa8c16', fontSize: 18 }}>
                ¥{gameStats.totalUnpaid.toFixed(2)}
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">收款进度</Text>
              <Progress
                percent={Math.round((gameStats.totalPaid / Math.max(gameStats.totalFinal, 0.01)) * 100)}
                status="active"
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card
        title="账单列表"
        bordered={false}
        extra={
          <Space>
            <Select
              placeholder="按局筛选"
              style={{ width: 220 }}
              allowClear
              value={selectedGameId}
              onChange={setSelectedGameId}
              options={completeGames.map(g => ({
                label: `${g.scriptName} (${g.scheduledTime})`,
                value: g.id
              }))}
            />
          </Space>
        }
      >
        {filteredBills.length === 0 ? (
          <Empty description="暂无账单" />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredBills}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      <Modal
        title="生成/重算账单 — 按玩家选择优惠"
        open={isGenerateModalOpen}
        onCancel={() => setIsGenerateModalOpen(false)}
        onOk={handleGenerateBills}
        okText="确认生成"
        width={700}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            为每位玩家选择要使用的优惠券组合，不选则按原价计费。<br />
            <Tag color="green">已支付和部分支付的账单不会被覆盖</Tag>
          </Text>
        </div>
        {currentGame && currentScript && (
          <List
            dataSource={currentGame.playerIds
              .map(pid => players.find(p => p.id === pid))
              .filter(Boolean) as typeof players
            }
            renderItem={player => {
              const existingBill = gameBills.find(b => b.playerId === player.id)
              const isProtected =
                existingBill &&
                (existingBill.paymentStatus === '已支付' || existingBill.paymentStatus === '部分支付')
              return (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} style={{ background: '#722ed1' }} />}
                    title={
                      <Space>
                        <strong>{player.name}</strong>
                        <Tag>¥{currentScript.price}</Tag>
                        {isProtected && (
                          <Tag color="green">{existingBill!.paymentStatus}（跳过重算）</Tag>
                        )}
                      </Space>
                    }
                    description={
                      isProtected ? (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            已收 ¥{existingBill!.paidAmount.toFixed(2)} / 应收 ¥{existingBill!.finalAmount.toFixed(2)}
                          </Text>
                        </div>
                      ) : (
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
        )}
      </Modal>

      <Modal
        title="收款登记"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={handleAddPayment}
        okText="确认收款"
        width={400}
      >
        {currentPaymentBill && (() => {
          const player = players.find(p => p.id === currentPaymentBill.playerId)
          const remain = currentPaymentBill.finalAmount - currentPaymentBill.paidAmount
          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">玩家：</Text>
                <strong>{player?.name}</strong>
              </div>
              <div>
                <Text type="secondary">应收：</Text>
                <strong>¥{currentPaymentBill.finalAmount.toFixed(2)}</strong>
              </div>
              <div>
                <Text type="secondary">已收：</Text>
                <Text type="success">¥{currentPaymentBill.paidAmount.toFixed(2)}</Text>
              </div>
              <div>
                <Text type="secondary">待收：</Text>
                <Text type="danger" strong>¥{remain.toFixed(2)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text type="secondary">收款类型：</Text>
                <Select
                  value={paymentType}
                  onChange={setPaymentType}
                  style={{ width: 120, marginLeft: 8 }}
                  options={[
                    { label: '定金', value: '定金' },
                    { label: '尾款', value: '尾款' },
                    { label: '全款', value: '全款' },
                    { label: '其他', value: '其他' }
                  ]}
                />
              </div>
              <div>
                <Text type="secondary">收款金额：</Text>
                <InputNumber
                  value={paymentAmount}
                  onChange={v => setPaymentAmount(v || 0)}
                  min={0}
                  max={remain}
                  step={10}
                  precision={2}
                  style={{ width: 200, marginLeft: 8 }}
                  addonBefore="¥"
                />
              </div>
              <div>
                <Text type="secondary">备注：</Text>
                <Input
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="选填"
                  style={{ marginTop: 4 }}
                />
              </div>
            </Space>
          )
        })()}
      </Modal>

      <Modal
        title="账单详情"
        open={!!showBillDetail}
        onCancel={() => setShowBillDetail(null)}
        footer={
          showBillDetail ? (
            <Space>
              <Button icon={<PrinterOutlined />} onClick={() => handlePrintBill(showBillDetail)}>
                打印
              </Button>
              {(showBillDetail.paymentStatus === '待支付' || showBillDetail.paymentStatus === '部分支付') && (
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => { openPaymentModal(showBillDetail); setShowBillDetail(null) }}
                >
                  收款
                </Button>
              )}
              {showBillDetail.paymentStatus === '待支付' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    handleMarkPaid(showBillDetail)
                    setShowBillDetail(null)
                  }}
                >
                  确认全款
                </Button>
              )}
              <Button onClick={() => setShowBillDetail(null)}>关闭</Button>
            </Space>
          ) : null
        }
        width={500}
      >
        {showBillDetail && (() => {
          const player = players.find(p => p.id === showBillDetail.playerId)
          const game = gameSessions.find(g => g.id === showBillDetail.gameId)
          return (
            <div>
              <pre style={{
                fontFamily: 'monospace',
                background: '#fafafa',
                padding: 16,
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {formatBillText(showBillDetail, player?.name || '-', game?.scriptName || '-')}
              </pre>
            </div>
          )
        })()}
      </Modal>
    </Space>
  )
}

export default BillManagement
