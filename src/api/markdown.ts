export function tableOfContents(content: string) {
  let fence = ''
  return content.split('\n').flatMap((line, index) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (marker) { if (!fence) fence = marker[1][0]; else if (marker[1][0] === fence) fence = ''; return [] }
    if (fence) return []
    const heading = line.match(/^(#{1,3})\s+(.+?)\s*#*$/)
    return heading ? [{ id: `section-${index + 1}`, level: heading[1].length, title: heading[2] }] : []
  })
}
