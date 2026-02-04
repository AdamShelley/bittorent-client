import { useEffect, useState } from 'react'
import { Input } from '../ui/input'

export const Settings = () => {
  const [saveLocation, setSaveLocation] = useState('/downloads')

  useEffect(() => {
    window.api.getSettings().then((settings) => {
      if (settings?.saveLocation) {
        setSaveLocation(settings.saveLocation)
      }
    })
  }, [])

  const saveSettings = (location: string): void => {
    window.api.saveSettings({ saveLocation: location })
  }

  const handleBrowse = async () => {
    try {
      const result = await window.api.openDirectoryDialog()
      if (!result.canceled && result.path) {
        setSaveLocation(result.path)
        saveSettings(result.path)
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-[13px] text-[#8b8b8e]">Download location</label>
        <div className="flex gap-2">
          <Input
            className="flex-1 h-8 bg-[#18181b] border-[#27272a] rounded-md px-3 text-[13px] text-[#ededef] focus:border-[#3f3f46] focus:ring-0"
            value={saveLocation}
            readOnly
          />
          <button
            onClick={handleBrowse}
            className="h-8 px-3 text-[13px] text-[#ededef] bg-[#18181b] border border-[#27272a] rounded-md hover:bg-[#222225] transition-colors"
          >
            Browse
          </button>
        </div>
      </div>
    </div>
  )
}
