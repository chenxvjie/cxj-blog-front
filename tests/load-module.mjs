import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import ts from 'typescript'

const urls = new Map()
export function moduleUrl(url) {
  if (urls.has(url.href)) return urls.get(url.href)
  const source = readFileSync(url, 'utf8').replaceAll('import.meta.env.DEV', 'true').replaceAll('import.meta.env.VITE_API_BASE_URL', 'undefined')
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  outputText = outputText.replace(/from ['"]([^'"]+)['"]/g, (_, name) => {
    const target = name.startsWith('.') ? moduleUrl(new URL(`${name}.ts`, url)) : import.meta.resolve(name)
    return `from '${target}'`
  })
  const result = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
  urls.set(url.href, result)
  return result
}
