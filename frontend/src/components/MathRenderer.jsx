import { InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'

/**
 * Render nội dung từ content_json: {blocks:[{type,content:[{type,value}]}]}
 * Hỗ trợ type="text" và type="math" (KaTeX inline).
 */
function MathRenderer({ content, addSpacing = true }) {
  if (!content) return null

  if (typeof content === 'string') {
    return <span className="math-content">{content}</span>
  }

  const blocks = content?.blocks ?? []

  return (
    <span className="math-content">
      {blocks.map((block, bi) => (
        <span key={bi} className={block.type === 'paragraph' ? 'block mb-1' : 'inline'}>
          {(block.content ?? []).map((item, ii) => {
            if (item.type === 'math') {
              return (
                <span key={ii}>
                  <InlineMath
                    math={item.value ?? ''}
                    renderError={() => <code className="text-red-500 text-xs">{item.value}</code>}
                  />
                  {addSpacing && ii < (block.content ?? []).length - 1 && " "}
                </span>
              )
            }
            const textContent = item.value ?? ''
            return (
              <span key={ii}>
                {textContent}
                {addSpacing && ii < (block.content ?? []).length - 1 && " "}
              </span>
            )
          })}
        </span>
      ))}
    </span>
  )
}

export default MathRenderer
