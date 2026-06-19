import React, { useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Form,
  Select,
  InputNumber,
  Button,
  Space,
  Table,
  Tag,
  Divider,
  Input,
  DatePicker,
  Switch,
  message,
  Modal,
  List,
  Typography
} from 'antd'
import {
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CalculatorOutlined,
  GiftOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { useAppStore } from '../store/useAppStore'
import type { DiscountCoupon, DiscountType, DiscountDetail } from '../types'
import {
  applyMultipleDiscounts,
  DEFAULT_DISCOUNT_ORDER,
  sortCouponsByOrder,
  calculateOptimalDiscount
} from '../modules/discount'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const DiscountConfig: React.FC = () => {
  const { coupons, discountOrder, updateDiscountOrder } = useAppStore()
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [couponForm] = Form.useForm()
  const [testAmount, setTestAmount] = useState<number>(200)
  const [testCouponIds, setTestCouponIds] = useState<string[]>([])
  const [useOptimal, setUseOptimal] = useState(true)

  const moveOrder = (type: DiscountType, direction: 'up' | 'down') => {
    const order = [...discountOrder.order]
    const idx = order.indexOf(type)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= order.length) return
    ;[order[idx], order[targetIdx]] = [order[targetIdx], order[idx]]
    updateDiscountOrder(order)
    message.success('优惠顺序已更新')
  }

  const handleAddCoupon = () => {
    couponForm.validateFields().then(values => {
      const dateRange = values.validRange as [Dayjs, Dayjs]
      const newCoupon: DiscountCoupon = {
        id: `c-${Date.now()}`,
        name: values.name,
        type: values.type,
        ...(values.type === 'coupon'
          ? {
              discountRate: values.discountRate / 10,
              maxDiscount: values.maxDiscount
            }
          : {
              discountAmount: values.discountAmount,
              threshold: values.threshold
            }),
        validFrom: dateRange[0].format('YYYY-MM-DD'),
        validTo: dateRange[1].format('YYYY-MM-DD'),
        isStackable: values.isStackable
      }
      message.success(`优惠券 "${newCoupon.name}" 已添加（演示环境，未持久化）`)
      setIsCouponModalOpen(false)
      couponForm.resetFields()
    })
  }

  const testResult = useMemo(() => {
    const selectedCoupons = coupons.filter(c => testCouponIds.includes(c.id))
    if (useOptimal) {
      return calculateOptimalDiscount(testAmount, coupons, discountOrder)
    }
    return {
      ...applyMultipleDiscounts(testAmount, selectedCoupons, discountOrder),
      usedCoupons: selectedCoupons.filter(c =>
        applyMultipleDiscounts(testAmount, selectedCoupons, discountOrder)
          .discountDetails.some(d => d.couponId === c.id)
      )
    }
  }, [testAmount, testCouponIds, coupons, discountOrder, useOptimal])

  const sortedCoupons = useMemo(() => {
    return sortCouponsByOrder(coupons, discountOrder.order)
  }, [coupons, discountOrder])

  const columns: ColumnsType<DiscountCoupon> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'coupon' ? 'purple' : 'orange'}>
          {type === 'coupon' ? '折扣券' : '满减券'}
        </Tag>
      )
    },
    {
      title: '优惠内容',
      key: 'content',
      render: (_, record) => {
        if (record.type === 'coupon') {
          return (
            <span>
              打 <strong>{(record.discountRate! * 10).toFixed(1)}</strong> 折
              {record.maxDiscount && `，最高减 ¥${record.maxDiscount}`}
            </span>
          )
        }
        return (
          <span>
            满 <strong>¥{record.threshold}</strong> 减 <strong>¥{record.discountAmount}</strong>
          </span>
        )
      }
    },
    {
      title: '有效期',
      key: 'validity',
      render: (_, record) => (
        <span>{record.validFrom} ~ {record.validTo}</span>
      )
    },
    {
      title: '可叠加',
      dataIndex: 'isStackable',
      key: 'isStackable',
      render: (stackable) => (
        <Tag color={stackable ? 'green' : 'red'}>
          {stackable ? '是' : '否（独占）'}
        </Tag>
      )
    }
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="优惠计算顺序配置"
            bordered={false}
            extra={
              <Button onClick={() => updateDiscountOrder(DEFAULT_DISCOUNT_ORDER)}>
                恢复默认
              </Button>
            }
          >
            <Alert type="info"
              showIcon
              message="优惠计算顺序说明"
              description="按从上到下的顺序依次应用优惠，不同顺序可能产生不同的最终价格。如先满减后折扣，与先折扣后满减的结果可能不同。"
              style={{ marginBottom: 16 }}
            />
            <List
              bordered
              dataSource={discountOrder.order}
              renderItem={(type, index) => (
                <List.Item
                  actions={[
                    <Button
                      key="up"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => moveOrder(type, 'up')}
                    >
                      上移
                    </Button>,
                    <Button
                      key="down"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === discountOrder.order.length - 1}
                      onClick={() => moveOrder(type, 'down')}
                    >
                      下移
                    </Button>
                  ]}
                >
                  <Space>
                    <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
                      第 {index + 1} 步
                    </Tag>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>
                      {type === 'coupon' ? '折扣券' : '满减券'}
                    </span>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="优惠计算器"
            bordered={false}
            icon={<CalculatorOutlined />}
          >
            <Form layout="vertical">
              <Form.Item label="原始金额 (元)">
                <InputNumber
                  min={0}
                  value={testAmount}
                  onChange={val => setTestAmount(val ?? 0)}
                  style={{ width: '100%' }}
                  prefix="¥"
                  step={10}
                />
              </Form.Item>

              <Form.Item label="自动选择最优方案">
                <Switch
                  checked={useOptimal}
                  onChange={setUseOptimal}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
              </Form.Item>

              {!useOptimal && (
                <Form.Item label="选择要使用的优惠券">
                  <Select
                    mode="multiple"
                    placeholder="请选择要叠加的优惠券"
                    value={testCouponIds}
                    onChange={setTestCouponIds}
                    options={coupons.map(c => ({
                      label: `${c.name} (${c.type === 'coupon' ? `${(c.discountRate! * 10).toFixed(1)}折` : `满${c.threshold}减${c.discountAmount}`})`,
                      value: c.id
                    }))}
                  />
                </Form.Item>
              )}
            </Form>

            <Divider />

            <div>
              <Row style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <Text type="secondary">原价：</Text>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text>¥{testAmount.toFixed(2)}</Text>
                </Col>
              </Row>

              {testResult.discountDetails.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>优惠明细：</Text>
                  {testResult.discountDetails.map((detail: DiscountDetail) => (
                    <div key={detail.couponId} className="discount-detail">
                      <Row>
                        <Col span={16}>
                          <Tag>[{detail.appliedOrder}]</Tag>
                          <span>{detail.couponName}</span>
                        </Col>
                        <Col span={8} style={{ textAlign: 'right', color: '#52c41a' }}>
                          -¥{detail.discountAmount.toFixed(2)}
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
              )}

              {testResult.usedCoupons && testResult.usedCoupons.length > 0 && useOptimal && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f6ffed', borderRadius: 4 }}>
                  <Text type="success">已自动选择最优组合（{testResult.usedCoupons.length}张券）</Text>
                </div>
              )}

              <Divider style={{ margin: '8px 0' }} />

              <Row style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <Text type="secondary">优惠合计：</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'right', color: '#52c41a' }}>
                  -¥{testResult.totalDiscount.toFixed(2)}
                </Col>
              </Row>

              <Row>
                <Col span={12}>
                  <Title level={4} style={{ margin: 0 }}>实付金额：</Title>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Title level={3} type="danger" style={{ margin: 0, color: '#ff4d4f' }}>
                    ¥{testResult.finalAmount.toFixed(2)}
                  </Title>
                </Col>
              </Row>

              {testResult.finalAmount === 0 && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff7e6', borderRadius: 4 }}>
                  <Text type="warning">⚠️ 叠加优惠后金额为0，已自动保护为最低0元（实际不能为负）</Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title="优惠券列表"
        bordered={false}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCouponModalOpen(true)}>
            添加优惠券
          </Button>
        }
      >
        <Alert
          type="warning"
          showIcon
          message="优惠券按配置顺序排序"
          description={`当前顺序：${sortedCoupons.map(c => c.name).join(' → ')}`}
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={sortedCoupons}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="添加优惠券"
        open={isCouponModalOpen}
        onOk={handleAddCoupon}
        onCancel={() => setIsCouponModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={520}
      >
        <Form form={couponForm} layout="vertical">
          <Form.Item
            label="优惠券名称"
            name="name"
            rules={[{ required: true, message: '请输入优惠券名称' }]}
          >
            <Input placeholder="如：新人8折券" />
          </Form.Item>

          <Form.Item
            label="优惠券类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="选择类型">
              <Select.Option value="coupon">折扣券（按比例打折）</Select.Option>
              <Select.Option value="full_reduction">满减券（满额立减）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type') as DiscountType
              if (type === 'coupon') {
                return (
                  <>
                    <Form.Item
                      label="折扣 (折)"
                      name="discountRate"
                      rules={[{ required: true, message: '请输入折扣' }]}
                    >
                      <InputNumber
                        min={0.1}
                        max={9.9}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="如：8 表示打8折"
                      />
                    </Form.Item>
                    <Form.Item
                      label="最高优惠金额 (元)（可选）"
                      name="maxDiscount"
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        placeholder="设置最高优惠上限"
                        prefix="¥"
                      />
                    </Form.Item>
                  </>
                )
              }
              return (
                <>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        label="满额门槛 (元)"
                        name="threshold"
                        rules={[{ required: true, message: '请输入满额门槛' }]}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" placeholder="如：100" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="立减金额 (元)"
                        name="discountAmount"
                        rules={[{ required: true, message: '请输入立减金额' }]}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" placeholder="如：20" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )
            }}
          </Form.Item>

          <Form.Item
            label="有效期"
            name="validRange"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day').subtract(1, 'day')}
            />
          </Form.Item>

          <Form.Item
            label="是否可与其他券叠加"
            name="isStackable"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="可叠加" unCheckedChildren="不可叠加（独占）" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

const Alert: React.FC<{
  type: 'info' | 'warning' | 'success' | 'error'
  showIcon?: boolean
  message: string
  description?: string
  style?: React.CSSProperties
}> = ({ type, showIcon, message: msg, description, style }) => {
  const colorMap = {
    info: { bg: '#e6f7ff', border: '#91d5ff', text: '#0050b3', icon: 'ℹ️' },
    warning: { bg: '#fffbe6', border: '#ffe58f', text: '#ad6800', icon: '⚠️' },
    success: { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d', icon: '✅' },
    error: { bg: '#fff2f0', border: '#ffccc7', text: '#cf1322', icon: '❌' }
  }
  const colors = colorMap[type]
  return (
    <div
      style={{
        padding: '12px 16px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        ...style
      }}
    >
      <div style={{ color: colors.text, fontWeight: 600 }}>
        {showIcon && <span style={{ marginRight: 8 }}>{colors.icon}</span>}
        {msg}
      </div>
      {description && (
        <div style={{ color: colors.text, marginTop: 4, fontSize: 13 }}>
          {description}
        </div>
      )}
    </div>
  )
}

export default DiscountConfig
