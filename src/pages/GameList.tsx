import React, { useState } from 'react'
import {
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Progress,
  Popconfirm,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useAppStore } from '../store/useAppStore'
import type { GameSession } from '../types'
import { createGameSession } from '../modules/matching'

const { RangePicker } = DatePicker
const { TextArea } = Input

const GameList: React.FC = () => {
  const { gameSessions, scripts, players, addGameSession, removeGameSession, setSelectedGameId } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const handleOpenModal = () => {
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleCreateGame = () => {
    form.validateFields().then(values => {
      const script = scripts.find(s => s.id === values.scriptId)
      const hostPlayer = players.find(p => p.id === values.hostPlayerId)
      if (!script) {
        message.error('请选择剧本')
        return
      }

      const scheduledTime = (values.scheduledTime as Dayjs).format('YYYY-MM-DD HH:mm')
      const newGame = createGameSession(
        script,
        scheduledTime,
        hostPlayer,
        values.room,
        values.dmId,
        values.note
      )

      addGameSession(newGame)
      message.success('拼场局创建成功')
      setIsModalOpen(false)
    })
  }

  const handleDeleteGame = (id: string) => {
    removeGameSession(id)
    message.success('已删除拼场局')
  }

  const columns: ColumnsType<GameSession> = [
    {
      title: '剧本名称',
      dataIndex: 'scriptName',
      key: 'scriptName',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '开场时间',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      sorter: (a, b) => dayjs(a.scheduledTime).valueOf() - dayjs(b.scheduledTime).valueOf()
    },
    {
      title: '房间',
      dataIndex: 'room',
      key: 'room',
      render: (room) => room || '-'
    },
    {
      title: '人数进度',
      key: 'players',
      render: (_, record) => (
        <div style={{ minWidth: 150 }}>
          <div style={{ marginBottom: 4, fontSize: 13 }}>
            {record.currentPlayers} / {record.requiredPlayers}
          </div>
          <Progress
            percent={Math.round((record.currentPlayers / record.requiredPlayers) * 100)}
            size="small"
            status={record.currentPlayers >= record.requiredPlayers ? 'success' : 'active'}
          />
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap: Record<string, string> = {
          '招募中': 'blue',
          '已成团': 'green',
          '进行中': 'orange',
          '已结束': 'default',
          '已取消': 'red'
        }
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
      },
      filters: [
        { text: '招募中', value: '招募中' },
        { text: '已成团', value: '已成团' },
        { text: '进行中', value: '进行中' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              setSelectedGameId(record.id)
              window.location.hash = '#/matching'
            }}
          >
            撮合玩家
          </Button>
          <Popconfirm
            title="确定删除此拼场局？"
            onConfirm={() => handleDeleteGame(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ color: '#666' }}>共 {gameSessions.length} 个拼场局</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
          新建拼场局
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={gameSessions}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="新建拼场局"
        open={isModalOpen}
        onOk={handleCreateGame}
        onCancel={() => setIsModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="选择剧本"
            name="scriptId"
            rules={[{ required: true, message: '请选择剧本' }]}
          >
            <Select placeholder="请选择要开的剧本">
              {scripts.map(s => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name} - {s.price}元 ({s.minPlayers}-{s.maxPlayers}人 / {s.duration}分钟)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="开场时间"
            name="scheduledTime"
            rules={[{ required: true, message: '请选择开场时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="选择开场时间"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item label="房间号" name="room">
            <Input placeholder="如：A101" />
          </Form.Item>

          <Form.Item label="发起玩家（可选）" name="hostPlayerId">
            <Select placeholder="选择发起组局的玩家" allowClear>
              {players.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="备注" name="note">
            <TextArea rows={3} placeholder="组局说明、要求等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GameList
