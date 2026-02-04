import { useState, useRef, useEffect } from 'react'
import { Download, Upload, CheckCircle2, Settings, LayoutGrid } from 'lucide-react'
import { cn } from '@renderer/lib'
import { SettingsModal } from '../../Settings/SettingsModal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'

type FilterType = 'all' | 'downloading' | 'seeding' | 'downloaded'

const MIN_WIDTH = 48
const COLLAPSED_WIDTH = 120

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
  const [width, setWidth] = useState(180)
  const [isResizing, setIsResizing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialWidthRef = useRef<number | null>(null)

  const isCollapsed = width < COLLAPSED_WIDTH

  // Load saved sidebar width on mount
  useEffect(() => {
    const loadWidth = async (): Promise<void> => {
      try {
        const settings = await window.api.getSettings()
        if (settings?.sidebarWidth) {
          setWidth(settings.sidebarWidth)
          initialWidthRef.current = settings.sidebarWidth
        } else {
          initialWidthRef.current = 180
        }
      } catch (err) {
        console.error('Failed to load sidebar width:', err)
        initialWidthRef.current = 180
      }
    }
    loadWidth()
  }, [])

  // Save sidebar width when it changes (debounced) - only if different from loaded value
  useEffect(() => {
    // Don't save until initial load is complete
    if (initialWidthRef.current === null) return
    // Don't save if width hasn't changed from initial
    if (width === initialWidthRef.current) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      window.api.saveSettings({ sidebarWidth: width })
      initialWidthRef.current = width // Update ref so subsequent same-value doesn't re-save
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [width])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= MIN_WIDTH && newWidth <= 300) {
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
    { id: 'all' as FilterType, label: 'All', icon: LayoutGrid },
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

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={sidebarRef}
        className="relative h-full border-r border-[#ffffff08] shrink-0 flex flex-col overflow-hidden"
        style={{ width: `${width}px` }}
      >
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.scrollbar-none::-webkit-scrollbar { display: none; }`}</style>
          <div className="space-y-0.5">
            {filters.map((filter) => {
              const Icon = filter.icon
              const button = (
                <button
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  className={cn(
                    'w-full flex items-center rounded-md transition-colors',
                    isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-1.5',
                    activeFilter === filter.id
                      ? 'bg-[#ffffff0a] text-[#ededef]'
                      : 'text-[#8b8b8e] hover:bg-[#ffffff06] hover:text-[#ededef]'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0" />}
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left text-[13px] truncate">{filter.label}</span>
                      {filter.count !== undefined && filter.count > 0 && (
                        <span className="text-[11px] text-[#5c5c5f] tabular-nums">
                          {filter.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )

              if (isCollapsed) {
                return (
                  <Tooltip key={filter.id}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">
                      {filter.label}
                      {filter.count !== undefined && filter.count > 0 && (
                        <span className="ml-1.5 text-[#5c5c5f]">({filter.count})</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return button
            })}
          </div>
        </div>

        {/* Settings at bottom */}
        <div className={cn('py-3 border-t border-[#ffffff08]', isCollapsed ? 'px-2' : 'px-2')}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={cn(
                    'w-full flex items-center rounded-md text-[#5c5c5f] hover:bg-[#ffffff06] hover:text-[#8b8b8e] transition-colors',
                    'justify-center p-2'
                  )}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[#5c5c5f] hover:bg-[#ffffff06] hover:text-[#8b8b8e] transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-[13px]">Settings</span>
            </button>
          )}
        </div>

        {/* Resize handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#ffffff10] transition-colors"
        />
      </div>

      <SettingsModal isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
    </TooltipProvider>
  )
}
