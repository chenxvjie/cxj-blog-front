import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './styles.css'
import { AppLayout } from './components/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieNotice } from './components/CookieNotice'
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const PostPage = lazy(() => import('./pages/PostPage').then(m => ({ default: m.PostPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })))
const ArchivePage = lazy(() => import('./pages/ExplorePages').then(m => ({ default: m.ArchivePage })))
const TagPage = lazy(() => import('./pages/ExplorePages').then(m => ({ default: m.TagPage })))
const SearchPage = lazy(() => import('./pages/ExplorePages').then(m => ({ default: m.SearchPage })))
const PrivacyPage = lazy(() => import('./pages/ExplorePages').then(m => ({ default: m.PrivacyPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const AdminPosts = lazy(() => import('./pages/ManagePosts').then(m => ({ default: m.AdminPosts })))
const EditorPage = lazy(() => import('./pages/ManagePosts').then(m => ({ default: m.EditorPage })))
const MediaPage = lazy(() => import('./pages/AdminPages').then(m => ({ default: m.MediaPage })))
const SettingsPage = lazy(() => import('./pages/AdminPages').then(m => ({ default: m.SettingsPage })))
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ConfigProvider theme={{ token: { colorPrimary: '#0284c7' } }}><QueryClientProvider client={queryClient}><ErrorBoundary><BrowserRouter><Suspense fallback={<div className="p-12 text-center">加载中…</div>}><Routes><Route element={<AppLayout />}><Route index element={<HomePage />} /><Route path="posts/:slug" element={<PostPage />} /><Route path="about" element={<AboutPage />} /><Route path="archive" element={<ArchivePage />} /><Route path="tags" element={<TagPage />} /><Route path="search" element={<SearchPage />} /><Route path="privacy" element={<PrivacyPage />} /><Route path="auth" element={<AuthPage />} /><Route path="admin" element={<Navigate to="/admin/posts" replace />} /><Route path="admin/posts" element={<AdminPosts />} /><Route path="admin/editor" element={<EditorPage />} /><Route path="admin/media" element={<MediaPage />} /><Route path="admin/settings" element={<SettingsPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes></Suspense><CookieNotice /></BrowserRouter></ErrorBoundary></QueryClientProvider></ConfigProvider></React.StrictMode>)
