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
  Divider,
  Typography
} from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  PrinterOutlined,
  MoneyCollectOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAppStore } from '../store/useAppStore'
import type { Bill, GameSession } from '../types'
import {
  generateBillsForGame,
  generateBill,
  markBillPaid,
  markBillRefunded,
  formatBillText,
  calculateGameTotalRevenue
} from '../modules/billing'

const { Title, Text } = Typography

const BillManagement: React.FC = () => {
  const {
    bills,
    gameSessions,
    players,
    scripts,
    coupons,
    discountOrder,
    addBills,
    addBill,
    updateBill
  } = useAppStore()

  const [showBillDetail, setShowBillDetail] = useState<Bill | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)

  const stats = useMemo(() => {
    const paid = bills.filter(b => b.paymentStatus === '已支付')
    const unpaid = bills.filter(b => b.paymentStatus === '待支付')
    return {
      totalBills: bills.length,
      paidAmount: paid.reduce((s, b) => s + b.finalAmount, 0),
      unpaidAmount: unpaid.reduce((s, b) => s + b.finalAmount, 0),
      totalDiscount: bills.reduce(
        (s, b) => s + b.discountDetails.reduce((ds, d) => ds + d.discountAmount, 0),
        0
      )
    }
  }, [bills])

  const handleGenerateBillsForGame = (gameId: string) => {
    const game = gameSessions.find(g => g.id === gameId)
    if (!game) return
    const script = scripts.find(s => s.id === game.scriptId)
    if (!script) return

    const playerCouponsMap = new Map<string, typeof coupons>()
    game.playerIds.forEach(pid => {
      playerCouponsMap.set(pid, coupons.slice(0, 2))
    })

    const existingBillPlayerIds = bills
      .filter(b => b.gameId === gameId)
      .map(b => b.playerId)

    const newPlayers = players.filter(
      p => game.playerIds.includes(p.id) && !existingBillPlayerIds.includes(p.id)
    )

    if (newPlayers.length === 0) {
      message.warning('该游戏所有玩家均已生成账单')
      setIsGenerateModalOpen(false)
      return
    }

    const newBills: Bill[] = newPlayers.map(player => {
      const playerCoupons = playerCouponsMap.get(player.id) ?? []
      return generateBill(game, player, script, playerCoupons, discountOrder)
    })

    addBills(newBills)
    message.success(`已为 ${newBills.length} 位玩家生成账单`)
    setIsGenerateModalOpen(false)
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

  const columns: ColumnsType<Bill> = [
    {
      title: '账单编号',
      dataIndex: 'id',
      key: 'id',
      width: 160,
      render: (id) => <Text code>{id}</Text>
    },
    {
      title: '玩家',
      key: 'player',
      render: (_, record) => {
        const player = players.find(p => p.id === record.playerId)
        return player?.name || record.playerId
      }
    },
    {
      title: '剧本/局',
      key: 'game',
      render: (_, record) => {
        const game = gameSessions.find(g => g.id === record.gameId)
        return game?.scriptName || record.gameId
      }
    },
    {
      title: '原价',
      dataIndex: 'originalAmount',
      key: 'originalAmount',
      render: (amt) => `¥${amt.toFixed(2)}`
    },
    {
      title: '优惠',
      key: 'discount',
      render: (_, record) => {
        const total = record.discountDetails.reduce((s, d) => s + d.discountAmount, 0)
        return total > 0 ? (
          <Tag color="green">-¥{total.toFixed(2)} ({record.discountDetails.length}项)</Tag>
        ) : <Tag>无</Tag>
      }
    },
    {
      title: '实付金额',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      render: (amt) => (
        <Text strong type={amt > 0 ? undefined : 'success'}>
          ¥{amt.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.finalAmount - b.finalAmount
    },
    {
      title: '状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => {
        const colorMap: Record<string, string> = {
          '待支付': 'orange',
          '已支付': 'green',
          '已退款': 'default'
        }
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
      },
      filters: [
        { text: '待支付', value: '待支付' },
        { text: '已支付', value: '已支付' },
        { text: '已退款', value: '已退款' }
      ],
      onFilter: (value, record) => record.paymentStatus === value
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => setShowBillDetail(record)}
          >
            详情
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => handlePrintBill(record)}
          >
            打印
          </Button>
          {record.paymentStatus === '待支付' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleMarkPaid(record)}
            >
              确认支付
            </Button>
          )}
          {record.paymentStatus === '已支付' && (
            <Button
              size="small"
              danger
              icon={<ReloadOutlined />}
              onClick={() => handleMarkRefunded(record)}
            >
              退款
            </Button>
          )}
        </Space>
      )
    }
  ]

  const gameStats = useMemo(() => {
    if (!selectedGameId) return null
    const game = gameSessions.find(g => g.id === selectedGameId)
    if (!game) return null
    const gameBills = bills.filter(b => b.gameId === selectedGameId)
    return {
      game,
      ...calculateGameTotalRevenue(gameBills),
      billCount: gameBills.length
    }
  }, [selectedGameId, bills, gameSessions])

  const completeGames = gameSessions.filter(
    g => g.status === '已成团' || g.status === '进行中' || g.status === '已结束'
  )

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

      {gameStats && (
        <Card
          title={`局：${gameStats.game.scriptName} - 统计`}
          bordered={false}
          extra={
            <Button onClick={() => setSelectedGameId(null)}>取消筛选</Button>
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
              <Text type="secondary">实收金额</Text>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#722ed1' }}>
                ¥{gameStats.totalFinal.toFixed(2)}
              </div>
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
            <Button
              type="primary"
              icon={<MoneyCollectOutlined />}
              onClick={() => setIsGenerateModalOpen(true)}
              disabled={completeGames.length === 0}
            >
              生成账单
            </Button>
          </Space>
        }
      >
        {bills.length === 0 ? (
          <Empty description="暂无账单，点击右上角「生成账单」开始" />
        ) : (
          <Table
            columns={columns}
            dataSource={
              selectedGameId
                ? bills.filter(b => b.gameId === selectedGameId)
                : bills
            }
            rowKey="id"
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => setSelectedGameId(record.gameId)
            })}
          />
        )}
      </Card>

      <Modal
        title="生成账单"
        open={isGenerateModalOpen}
        onCancel={() => setIsGenerateModalOpen(false)}
        footer={null}
        width={480}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">选择要生成账单的局：</Text>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          {completeGames.map(game => {
            const script = scripts.find(s => s.id === game.scriptId)
            const existingCount = bills.filter(b => b.gameId === game.id).length
            return (
              <Card
                key={game.id}
                hoverable
                size="small"
                onClick={() => handleGenerateBillsForGame(game.id)}
              >
                <Row align="middle">
                  <Col flex="auto">
                    <div style={{ fontWeight: 600 }}>{game.scriptName}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>{game.scheduledTime}</div>
                  </Col>
                  <Col>
                    <Tag color="blue">{game.currentPlayers}人</Tag>
                    <Tag color={existingCount > 0 ? 'green' : 'orange'}>
                      已出{existingCount}/{game.currentPlayers}张
                    </Tag>
                    <div style={{ color: '#722ed1', fontSize: 12, marginTop: 4 }}>
                      ¥{script?.price || 0}/人
                    </div>
                  </Col>
                </Row>
              </Card>
            )
          })}
          {completeGames.length === 0 && (
            <Empty description="暂无可生成账单的局（需要已成团或进行中）" />
          )}
        </Space>
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
              {showBillDetail.paymentStatus === '待支付' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    handleMarkPaid(showBillDetail)
                    setShowBillDetail(null)
                  }}
                >
                  确认支付
                </Button>
              )}
              <Button onClick={() => setShowBillDetail(null)}>关闭</Button>
            </Space>
          ) : null
        }
        width={480}
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
