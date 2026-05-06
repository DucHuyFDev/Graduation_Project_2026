import { useState } from 'react'
import { ChevronRight, BookOpen } from 'lucide-react'

/**
 * Component đệ quy render cây chuyên đề.
 * Props: node (topic object), onSelect (callback), selectedId
 */
function TopicTreeNode({ node, onSelect, selectedId }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = node.id === selectedId
  // Lá cây (có thể chọn để luyện tập) là node không có con hoặc level >= 3
  const isLeaf = !hasChildren || node.level >= 3

  const handleClick = () => {
    if (hasChildren) setIsOpen(!isOpen)
    if (isLeaf) onSelect(node)
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 group
          ${isSelected ? 'bg-[#1e3a5f] text-white' : 'hover:bg-gray-100 text-gray-700'}`}
        style={{ paddingLeft: `${(node.level - 1) * 16 + 12}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            size={14}
            className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${isSelected ? 'text-white' : 'text-gray-400'}`}
          />
        ) : (
          <BookOpen size={13} className={`flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-gray-400'}`} />
        )}
        <span className={`text-sm font-medium truncate ${node.level === 1 ? 'font-semibold' : ''}`}>
          {node.name}
        </span>
      </div>

      {/* Render children đệ quy khi mở */}
      {isOpen && hasChildren && (
        <div>
          {node.children.map(child => (
            <TopicTreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TopicTreeNode
