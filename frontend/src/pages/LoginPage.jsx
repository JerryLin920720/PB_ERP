import { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined, LoadingOutlined } from '@ant-design/icons';
import useAuth from '../auth/useAuth';
import './LoginPage.css';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login, loginError } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background glowing elements */}
      <div className="glow-circle glow-circle-1"></div>
      <div className="glow-circle glow-circle-2"></div>

      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <div className="logo-badge">鞋貿ERP</div>
          <Title level={3} className="login-title">
            揚網科技ERP Web V1
          </Title>
          <Text type="secondary" className="login-subtitle">
            歡迎登入企業資源規劃系統
          </Text>
        </div>

        {loginError && (
          <Alert
            message={loginError}
            type="error"
            showIcon
            closable={false}
            className="login-alert"
          />
        )}

        <Form
          name="login_form"
          className="login-form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '請輸入使用者帳號！' }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="帳號 (Username)"
              disabled={loading}
              className="login-input"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '請輸入登入密碼！' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="密碼 (Password)"
              disabled={loading}
              className="login-input"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              disabled={loading}
            >
              {loading ? (
                <span>
                  <LoadingOutlined style={{ marginRight: 8 }} spin />
                  登入驗證中...
                </span>
              ) : (
                '安全登入 (Login)'
              )}
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <Text className="footer-text">
            © 2026 Youngnet Inc. All rights reserved.
          </Text>
        </div>
      </Card>
    </div>
  );
}
