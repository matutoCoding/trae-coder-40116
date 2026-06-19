import React, { useState } from 'react'
import {
  Table,
  Tag,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Avatar,
  Row,
  Col,
  Statistic
} from 'antd'
import { UserOutlined, PlusOutlined, HeartOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAppStore } from '../store/useAppStore'
import type { Player, ScriptTheme, ScriptDifficulty } from '../types'
import { v4 as uuidv4 } from 'uuid'

const allThemes: ScriptTheme[] = [
  '恐怖', '情感', '推理', '机制', '欢乐', '硬核',
  '变格', '本格', '古风', '现代', '科幻', '谍战'
]

const allDifficulties: ScriptDifficulty[] = ['新手', '进阶', '硬核', '骨灰']

const PlayerManagement: React.FC = () => {
  const { players, addPlayer } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const handleAddPlayer = () => {
    form.validateFields().then(values => {
      const newPlayer: Player = {
        id: `p-${uuidv4().slice(0, 8)}`,
        name: values.name,
        phone: values.phone,
        preferredThemes: values.preferredThemes || [],
        preferredDifficulty: values.preferredDifficulty || [],
        tags: (values.tags || '').split(/[,，\s]+/).filter(Boolean),
        registeredAt: new Date().toISOString().slice(0, 10),
        totalGames: 0
      }
      addPlayer(newPlayer)
      message.success(`玩家 "${newPlayer.name}" 已添加`)
      setIsModalOpen(false)
      form.resetFields()
    })
  }

  const columns: ColumnsType<Player> = [
    {
      title: '玩家信息',
      key: 'info',
      render: (_, player) => (
        <Space>
          <Avatar size={40} icon={<UserOutlined />} style={{ background: '#722ed1' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{player.name}</div>
            <div style={{ color: '#999', fontSize: 12 }}>{player.phone}</div>
          </div>
        </Space>
      )
    },
    {
      title: '偏好题材',
      dataIndex: 'preferredThemes',
      key: 'preferredThemes',
      render: (themes: string[]) => (
        <Space wrap>
          {themes.length > 0 ? themes.map(t => (
            <Tag key={t} color="purple">{t}</Tag>
          )) : <Tag>未设置</Tag>}
        </Space>
      )
    },
    {
      title: '偏好难度',
      dataIndex: 'preferredDifficulty',
      key: 'preferredDifficulty',
      render: (diffs: string[]) => (
        <Space wrap>
          {diffs.length > 0 ? diffs.map(d => (
            <Tag key={d} color="orange">{d}</Tag>
          )) : <Tag>未设置</Tag>}
        </Space>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space wrap>
          {tags.length > 0 ? tags.map(t => (
            <Tag key={t} color="blue">{t}</Tag>
          )) : <Tag>无</Tag>}
        </Space>
      )
    },
    {
      title: '总场次',
      dataIndex: 'totalGames',
      key: 'totalGames',
      render: (n) => <strong>{n} 场</strong>,
      sorter: (a, b) => a.totalGames - b.totalGames
    },
    {
      title: '注册时间',
      dataIndex: 'registeredAt',
      key: 'registeredAt'
    }
  ]

  const themeStats = React.useMemo(() => {
    const map = new Map<string, number>()
    players.forEach(p => p.preferredThemes.forEach(t => map.set(t, (map.get(t) || 0) + 1)))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [players])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="注册玩家总数"
              value={players.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="累计总场次"
              value={players.reduce((s, p) => s + p.totalGames, 0)}
              prefix={<HeartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false} title="最受欢迎题材">
            <Space wrap>
              {themeStats.map(([t, c]) => (
                <Tag key={t} color="purple" style={{ fontSize: 14, padding: '4px 12px' }}>
                  {t}: {c}人
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title="玩家列表"
        bordered={false}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            新增玩家
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={players}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新增玩家"
        open={isModalOpen}
        onOk={handleAddPlayer}
        onCancel={() => setIsModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="玩家姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="如：张三" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[{ required: true, message: '请输入手机号' }]}
              >
                <Input placeholder="13800138000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="偏好题材" name="preferredThemes">
            <Select
              mode="multiple"
              placeholder="选择喜欢的剧本类型"
              options={allThemes.map(t => ({ label: t, value: t }))}
            />
          </Form.Item>

          <Form.Item label="偏好难度" name="preferredDifficulty">
            <Select
              mode="multiple"
              placeholder="选择偏好的难度等级"
              options={allDifficulties.map(d => ({ label: d, value: d }))}
            />
          </Form.Item>

          <Form.Item label="玩家标签" name="tags" extra="用逗号或空格分隔多个标签">
            <Input placeholder="如：高玩, 推土机, 情感本爱好者" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default PlayerManagement
