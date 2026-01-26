import { useState, useRef, useEffect } from 'react'
import { Download, Upload, CheckCircle2 } from 'lucide-react'
import { cn } from '@renderer/lib'

type FilterType = 'all' | 'downloading' | 'seeding' | 'downloaded'

interface ResizableSidebarProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts: {
    downloading: number
    seeding: number
    downloaded: number
  }
}

export const ResizableSidebar = ({
  activeFilter,
  onFilterChange,
  counts
}: ResizableSidebarProps): React.JSX.Element => {
  const [width, setWidth] = useState(200)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 0 && newWidth <= 400) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = (): void => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleMouseDown = (): void => {
    setIsResizing(true)
  }

  const filters = [
    { id: 'all' as FilterType, label: 'All', icon: null },
    {
      id: 'downloading' as FilterType,
      label: 'Downloading',
      icon: Download,
      count: counts.downloading
    },
    { id: 'seeding' as FilterType, label: 'Seeding', icon: Upload, count: counts.seeding },
    {
      id: 'downloaded' as FilterType,
      label: 'Downloaded',
      icon: CheckCircle2,
      count: counts.downloaded
    }
  ]

  if (width === 0) {
    return (
      <div className="relative h-full shrink-0" style={{ width: '4px' }}>
        {/* Hidden sidebar with just resize handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-full cursor-col-resize hover:bg-border/50 transition-colors"
        />
      </div>
    )
  }

  return (
    <div
      ref={sidebarRef}
      className="relative h-full bg-background border-r border-slate-200/10 border-border shrink-0"
      style={{ width: `${width}px` }}
    >
      <div className="h-full overflow-y-auto p-4">
        <div className="space-y-1">
          {filters.map((filter) => {
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  activeFilter === filter.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50'
                )}
              >
                <span className="flex-1 text-left">{filter.label}</span>
                {filter.count !== undefined && filter.count > 0 && (
                  <span className="text-xs text-muted-foreground">{filter.count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-border active:bg-border transition-colors"
      />
    </div>
  )
}
