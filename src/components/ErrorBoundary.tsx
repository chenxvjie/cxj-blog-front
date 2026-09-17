import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Result } from 'antd'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* reserved: connect Sentry/error reporting after service selection */ }
  render() { return this.state.failed ? <Result status="error" title="页面出现异常" extra={<Button onClick={() => location.reload()}>刷新页面</Button>} /> : this.props.children }
}
