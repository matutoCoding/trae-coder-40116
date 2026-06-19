import React, { useState } from 'react'
import { Layout, Menu } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  TeamOutlined,
  HeartOutlined,
  GiftOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  UserOutlined,
  BookOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据概览' },
  { key: '/games', icon: <TeamOutlined />, label: '拼场局管理' },
  { key: '/matching', icon: <HeartOutlined />, label: '双向撮合' },
  { key: '/discount', icon: <GiftOutlined />, label: '优惠配置' },
  { key: '/bills', icon: <FileTextOutlined />, label: '账单管理' },
  { key: '/dm-schedule', icon: <ScheduleOutlined />, label: 'DM排班' },
  { key: '/players', icon: <UserOutlined />, label: '玩家管理' },
  { key: '/scripts', icon: <BookOutlined />, label: '剧本管理' }
]

const MainLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0
        }}
      >
        <div className="logo">
          <CustomerServiceOutlined />
          {!collapsed && <span>剧本杀组局助手</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {menuItems.find(m => m.key === location.pathname)?.label || '剧本杀组局助手'}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>
            欢迎使用剧本杀组局管理系统
          </div>
        </Header>
        <Content className="page-container">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
