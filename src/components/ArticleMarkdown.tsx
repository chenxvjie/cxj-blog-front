import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, message } from 'antd'
const anchor = (v: string) => v.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/(^-|-$)/g, '')
export function ArticleMarkdown({ content }: { content: string }) { return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: ({ children, className }) => <span className={className}><Button size="small" className="float-right" onClick={() => { navigator.clipboard.writeText(String(children)); message.success('代码已复制') }}>复制</Button><code>{children}</code></span>, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>, img: ({ src, alt }) => <img loading="lazy" src={src} alt={alt ?? ''} />, h2: ({ children }) => <h2 id={anchor(String(children))}>{children}</h2>, h3: ({ children }) => <h3 id={anchor(String(children))}>{children}</h3> }}>{content}</ReactMarkdown> }
