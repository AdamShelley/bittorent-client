import { JSX, useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { FolderOpen, HardDrive, FileText, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { cn } from '@renderer/lib'

interface TorrentFile {
  path: string
  size: number
}

interface TorrentInfo {
  name: string
  totalSize: number
  files: TorrentFile[]
}

interface AddTorrentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: { downloadLocation: string; folderName: string; selectedFiles?: string[] }) => void
  torrentPath: string | null
}

export const AddTorrentModal = ({
  isOpen,
  onClose,
  onConfirm,
  torrentPath
}: AddTorrentModalProps): JSX.Element => {
  const [torrentInfo, setTorrentInfo] = useState<TorrentInfo | null>(null)
  const [downloadLocation, setDownloadLocation] = useState('')
  const [folderName, setFolderName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isFilesExpanded, setIsFilesExpanded] = useState(false)

  // Load settings and torrent info when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load settings first
      const loadData = async (): Promise<void> => {
        try {
          const settings = await window.api.getSettings()
          console.log('Loaded settings:', settings)
          if (settings?.saveLocation) {
            setDownloadLocation(settings.saveLocation)
          }
        } catch (err) {
          console.error('Failed to load settings:', err)
        }

        // Then load torrent info
        if (torrentPath) {
          await loadTorrentInfo()
        }
      }
      loadData()
    } else {
      // Reset state when modal closes
      setTorrentInfo(null)
      setFolderName('')
      setError(null)
      setSelectedFiles(new Set())
      setIsFilesExpanded(false)
    }
  }, [isOpen, torrentPath])

  const loadTorrentInfo = async (): Promise<void> => {
    if (!torrentPath) return

    setIsLoading(true)
    setError(null)
    try {
      console.log('Getting torrent info for:', torrentPath)
      const info = await window.api.getTorrentInfo(torrentPath)
      console.log('Torrent info result:', info)
      if (info) {
        setTorrentInfo(info)
        setFolderName(info.name)
        // Select all files by default
        setSelectedFiles(new Set(info.files.map((f) => f.path)))
      } else {
        setError('Failed to read torrent file')
      }
    } catch (err) {
      console.error('Failed to load torrent info:', err)
      setError('Failed to load torrent info')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBrowse = async (): Promise<void> => {
    try {
      const result = await window.api.openDirectoryDialog()
      if (!result.canceled && result.path) {
        setDownloadLocation(result.path)
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error)
    }
  }

  const handleConfirm = (): void => {
    onConfirm({ 
      downloadLocation, 
      folderName,
      selectedFiles: torrentInfo && torrentInfo.files.length > 1 ? Array.from(selectedFiles) : undefined
    })
    onClose()
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const toggleFile = (filePath: string): void => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) {
        next.delete(filePath)
      } else {
        next.add(filePath)
      }
      return next
    })
  }

  const toggleAllFiles = (): void => {
    if (!torrentInfo) return
    if (selectedFiles.size === torrentInfo.files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(torrentInfo.files.map((f) => f.path)))
    }
  }

  const selectedSize = useMemo(() => {
    if (!torrentInfo) return 0
    return torrentInfo.files
      .filter((f) => selectedFiles.has(f.path))
      .reduce((sum, f) => sum + f.size, 0)
  }, [torrentInfo, selectedFiles])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#111113] ring-[#222225]/50 sm:max-w-md p-0" aria-describedby={undefined}>
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-[13px] font-medium text-[#ededef]">Add Torrent</DialogTitle>
          <DialogDescription className="sr-only">
            Configure download options for the torrent
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 pt-4 space-y-5">
          {isLoading ? (
            <div className="text-[13px] text-[#5c5c5f]">Loading torrent info...</div>
          ) : error ? (
            <div className="text-[13px] text-red-400">{error}</div>
          ) : (
            <>
              {/* Torrent Info */}
              {torrentInfo && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-md bg-[#ffffff06]">
                    <FileText className="w-4 h-4 text-[#5c5c5f] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#ededef] truncate">{torrentInfo.name}</p>
                      <p className="text-[12px] text-[#5c5c5f] mt-0.5">
                        {formatSize(selectedSize)} of {formatSize(torrentInfo.totalSize)} · {selectedFiles.size}/{torrentInfo.files.length} file
                        {torrentInfo.files.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  </div>
                  
                  {/* File Selection */}
                  {torrentInfo.files.length > 1 && (
                    <div className="rounded-md border border-[#27272a] overflow-hidden">
                      <button
                        onClick={() => setIsFilesExpanded(!isFilesExpanded)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#8b8b8e] hover:bg-[#18181b] transition-colors"
                      >
                        {isFilesExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span>Select files</span>
                      </button>
                      
                      {isFilesExpanded && (
                        <div className="border-t border-[#27272a]">
                          {/* Select All */}
                          <button
                            onClick={toggleAllFiles}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] hover:bg-[#18181b] transition-colors border-b border-[#27272a]"
                          >
                            <div
                              className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                                selectedFiles.size === torrentInfo.files.length
                                  ? 'bg-[#2563eb] border-[#2563eb]'
                                  : selectedFiles.size > 0
                                    ? 'bg-[#2563eb]/50 border-[#2563eb]'
                                    : 'border-[#3f3f46]'
                              )}
                            >
                              {selectedFiles.size > 0 && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-[#ededef]">Select All</span>
                          </button>
                          
                          {/* File List */}
                          <div className="max-h-48 overflow-y-auto">
                            {torrentInfo.files.map((file) => (
                              <button
                                key={file.path}
                                onClick={() => toggleFile(file.path)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[13px] hover:bg-[#18181b] transition-colors"
                              >
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                                    selectedFiles.has(file.path)
                                      ? 'bg-[#2563eb] border-[#2563eb]'
                                      : 'border-[#3f3f46]'
                                  )}
                                >
                                  {selectedFiles.has(file.path) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="text-[#ededef] truncate flex-1 text-left">{file.path}</span>
                                <span className="text-[#5c5c5f] shrink-0">{formatSize(file.size)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Folder Name */}
              <div className="space-y-2">
                <label className="text-[13px] text-[#8b8b8e]">Save as</label>
                <Input
                  className="h-8 bg-[#18181b] border-[#27272a] rounded-md px-3 text-[13px] text-[#ededef] focus:border-[#3f3f46] focus:ring-0"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Folder name"
                />
              </div>

              {/* Download Location */}
              <div className="space-y-2">
                <label className="text-[13px] text-[#8b8b8e]">Download location</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c5f]" />
                    <Input
                      className="h-8 bg-[#18181b] border-[#27272a] rounded-md pl-9 pr-3 text-[13px] text-[#ededef] focus:border-[#3f3f46] focus:ring-0"
                      value={downloadLocation}
                      onChange={(e) => setDownloadLocation(e.target.value)}
                      placeholder="/downloads"
                    />
                  </div>
                  <button
                    onClick={handleBrowse}
                    className="h-8 px-3 text-[13px] text-[#ededef] bg-[#18181b] border border-[#27272a] rounded-md hover:bg-[#222225] transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-5 py-4 border-t border-[#ffffff08] gap-2">
          <button
            onClick={onClose}
            className="h-8 px-4 text-[13px] text-[#8b8b8e] hover:text-[#ededef] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !!error || !downloadLocation || selectedFiles.size === 0}
            className="h-8 px-4 text-[13px] text-[#ededef] bg-[#2563eb] hover:bg-[#3b82f6] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Torrent
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
