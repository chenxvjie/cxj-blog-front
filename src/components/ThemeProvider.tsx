import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ConfigProvider, Empty, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

const ThemeContext = createContext({ dark: false, toggleTheme: () => {} })
function savedTheme() { try { return localStorage.getItem('theme') === 'dark' } catch { return false } }
function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}
applyTheme(savedTheme())
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(savedTheme)
  useEffect(() => { applyTheme(dark) }, [dark])
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === 'theme' || event.key === null) setDark(savedTheme()) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const toggleTheme = () => setDark(current => {
    const next = !current
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* Still switch when browser storage is unavailable. */ }
    return next
  })
  return <ThemeContext.Provider value={{ dark, toggleTheme }}><ConfigProvider renderEmpty={() => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />} locale={{ ...zhCN, Modal: { ...zhCN.Modal, okText: '确认', cancelText: '取消', justOkText: '确认' }, Popconfirm: { ...zhCN.Popconfirm, okText: '确认', cancelText: '取消' } }} theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: dark ? '#38bdf8' : '#0284c7', colorBgLayout: dark ? '#0f172a' : '#f8fafc', colorBgContainer: dark ? '#1e293b' : '#ffffff', colorText: dark ? '#e2e8f0' : '#0f172a', colorBorder: dark ? '#475569' : '#d1d5db' } }}>{children}</ConfigProvider></ThemeContext.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() { return useContext(ThemeContext) }
