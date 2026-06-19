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
  InputNumber,
  message,
  Row,
  Col,
  Statistic
} from 'antd'
import { BookOutlined, PlusOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAppStore } from '../store/useAppStore'
import type { Script, ScriptTheme, ScriptDifficulty } from '../types'
import { v4 as uuidv4 } from 'uuid'

const allThemes: ScriptTheme[] = [
  '恐怖', '情感', '推理', '机制', '欢乐', '硬核',
  '变格', '本格', '古风', '现代', '科幻', '谍战'
]

const allDifficulties: ScriptDifficulty[] = ['新手', '进阶', '硬核', '骨灰']

const ScriptManagement: React.FC = () => {
  const { scripts, addScript } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const handleAddScript = () => {
    form.validateFields().then(values => {
      const newScript: Script = {
        id: `s-${uuidv4().slice(0, 8)}`,
        name: values.name,
        themes: values.themes || [],
        difficulty: values.difficulty,
        minPlayers: values.minPlayers,
        maxPlayers: values.maxPlayers,
        duration: values.duration,
        price: values.price,
        description: values.description || ''
      }
      addScript(newScript)
      message.success(`剧本 "${newScript.name}" 已添加`)
      setIsModalOpen(false)
      form.resetFields()
    })
  }

  const columns: ColumnsType<Script> = [
    {
      title: '剧本名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong style={{ fontSize: 16 }}>{text}</strong>
    },
    {
      title: '题材标签',
      dataIndex: 'themes',
      key: 'themes',
      render: (themes: string[]) => (
        <Space wrap>
          {themes.map(t => (
            <Tag key={t} color="purple">{t}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (d) => {
        const colorMap: Record<string, string> = {
          '新手': 'green',
          '进阶': 'blue',
          '硬核': 'orange',
          '骨灰': 'red'
        }
        return <Tag color={colorMap[d]}>{d}</Tag>
      },
      filters: allDifficulties.map(d => ({ text: d, value: d })),
      onFilter: (value, record) => record.difficulty === value
    },
    {
      title: '人数',
      key: 'players',
      render: (_, r) => `${r.minPlayers}-${r.maxPlayers}人`,
      sorter: (a, b) => a.minPlayers - b.minPlayers
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (m) => {
        const hours = Math.floor(m / 60)
        const mins = m % 60
        return `${hours > 0 ? hours + '小时' : ''}${mins > 0 ? mins + '分钟' : ''}`
      },
      sorter: (a, b) => a.duration - b.duration
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (p) => <strong style={{ color: '#722ed1' }}>¥{p}</strong>,
      sorter: (a, b) => a.price - b.price
    },
    {
      title: '简介',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 250
    }
  ]

  const difficultyStats = React.useMemo(() => {
    const map = new Map<string, number>()
    scripts.forEach(s => map.set(s.difficulty, (map.get(s.difficulty) || 0) + 1))
    return map
  }, [scripts])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="剧本总数"
              value={scripts.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="平均价格"
              value={Math.round(scripts.reduce((s, x) => s + x.price, 0) / Math.max(scripts.length, 1))}
              prefix="¥"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="平均时长"
              value={Math.round(scripts.reduce((s, x) => s + x.duration, 0) / 60 / Math.max(scripts.length, 1) * 10) / 10}
              suffix="小时"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false}>
            <Statistic
              title="题材数量"
              value={new Set(scripts.flatMap(s => s.themes)).size}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="剧本库"
        bordered={false}
        extra={
          <Space>
            {allDifficulties.map(d => (
              <Tag key={d} color={
                d === '新手' ? 'green' : d === '进阶' ? 'blue' : d === '硬核' ? 'orange' : 'red'
              }>
                {d}: {difficultyStats.get(d) || 0}本
              </Tag>
            ))}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              新增剧本
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={scripts}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新增剧本"
        open={isModalOpen}
        onOk={handleAddScript}
        onCancel={() => setIsModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="剧本名称"
            name="name"
            rules={[{ required: true, message: '请输入剧本名称' }]}
          >
            <Input placeholder="如：雾都疑云" />
          </Form.Item>

          <Form.Item
            label="题材标签"
            name="themes"
            rules={[{ required: true, message: '请选择题材标签' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择剧本的题材标签（可多选）"
              options={allThemes.map(t => ({ label: t, value: t }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="难度等级"
                name="difficulty"
                rules={[{ required: true, message: '请选择难度' }]}
              >
                <Select placeholder="选择难度">
                  {allDifficulties.map(d => (
                    <Select.Option key={d} value={d}>{d}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="最低人数"
                name="minPlayers"
                rules={[{ required: true, message: '必填' }]}
              >
                <InputNumber min={2} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="最高人数"
                name="maxPlayers"
                rules={[{ required: true, message: '必填' }]}
              >
                <InputNumber min={2} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="游戏时长（分钟）"
                name="duration"
                rules={[{ required: true, message: '必填' }]}
              >
                <InputNumber min={30} max={720} step={30} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="单人价格（元）"
                name="price"
                rules={[{ required: true, message: '必填' }]}
              >
                <InputNumber min={0} step={10} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="剧本简介" name="description">
            <Input.TextArea rows={3} placeholder="剧本简介、背景故事等" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default ScriptManagement
