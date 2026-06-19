import React from 'react'
import { Row, Col, Card, Progress, Tag, List, Avatar } from 'antd'
import {
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  ScheduleOutlined,
  HeartOutlined,
  MoneyCollectOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'

const Dashboard: React.FC = () => {
  const { gameSessions, players, scripts, dms, willingnessList, bills } = useAppStore()

  const recruitingGames = gameSessions.filter(g => g.status === '招募中').length
  const confirmedGames = gameSessions.filter(g => g.status === '已成团').length
  const matchedPairs = willingnessList.filter(w => w.status === '已同意').length
  const totalRevenue = bills
    .filter(b => b.paymentStatus === '已支付')
    .reduce((sum, b) => sum + b.finalAmount, 0)

  const statCards = [
    {
      title: '拼场局总数',
      value: gameSessions.length,
      icon: <TeamOutlined />,
      color: '#1890ff',
      suffix: `招募中 ${recruitingGames} / 已成团 ${confirmedGames}`
    },
    {
      title: '注册玩家',
      value: players.length,
      icon: <UserOutlined />,
      color: '#52c41a',
      suffix: `累计场次 ${players.reduce((s, p) => s + p.totalGames, 0)}`
    },
    {
      title: '剧本库',
      value: scripts.length,
      icon: <BookOutlined />,
      color: '#722ed1',
      suffix: `${scripts.map(s => s.themes).flat().length}种题材`
    },
    {
      title: 'DM主持',
      value: dms.length,
      icon: <ScheduleOutlined />,
      color: '#fa8c16',
      suffix: `平均评分 ${(dms.reduce((s, d) => s + d.rating, 0) / Math.max(dms.length, 1)).toFixed(1)}`
    },
    {
      title: '成功撮合',
      value: matchedPairs,
      icon: <HeartOutlined />,
      color: '#eb2f96',
      suffix: `双向意愿 ${willingnessList.length} 条`
    },
    {
      title: '营收总额',
      value: `¥${totalRevenue.toFixed(2)}`,
      icon: <MoneyCollectOutlined />,
      color: '#13c2c2',
      suffix: `已出账单 ${bills.length} 张`
    }
  ]

  const themeStats = React.useMemo(() => {
    const map = new Map<string, number>()
    scripts.forEach(s => s.themes.forEach(t => map.set(t, (map.get(t) || 0) + 1)))
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [scripts])

  return (
    <div>
      <Row gutter={[16, 16]}>
        {statCards.map((card, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>{card.title}</div>
                  <div style={{ color: '#333', fontSize: 28, fontWeight: 600 }}>{card.value}</div>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{card.suffix}</div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${card.color}20`,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24
                  }}
                >
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="近期拼场局" bordered={false}>
            <List
              dataSource={gameSessions.slice(0, 5)}
              renderItem={game => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<TeamOutlined />} style={{ background: '#722ed1' }} />}
                    title={
                      <span>
                        {game.scriptName}
                        <Tag
                          color={
                            game.status === '招募中' ? 'blue'
                              : game.status === '已成团' ? 'green'
                              : game.status === '进行中' ? 'orange'
                              : 'default'
                          }
                          style={{ marginLeft: 8 }}
                        >
                          {game.status}
                        </Tag>
                      </span>
                    }
                    description={
                      <span>
                        {game.scheduledTime} | 人数：{game.currentPlayers}/{game.requiredPlayers}
                      </span>
                    }
                  />
                  <Progress
                    percent={Math.round((game.currentPlayers / game.requiredPlayers) * 100)}
                    size="small"
                    style={{ width: 120 }}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="剧本题材分布" bordered={false}>
            <div style={{ padding: '8px 0' }}>
              {themeStats.map(([theme, count]) => (
                <div key={theme} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Tag color="purple">{theme}</Tag>
                    <span style={{ color: '#666' }}>{count} 本</span>
                  </div>
                  <Progress
                    percent={Math.round((count / Math.max(...themeStats.map(t => t[1]), 1)) * 100)}
                    showInfo={false}
                    strokeColor="#722ed1"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
