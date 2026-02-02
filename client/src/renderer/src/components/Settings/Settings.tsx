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
    <div>
      <ul>
        <li className="flex flex-col gap-2">
          <h5>Save Location</h5>
          <div className="flex gap-2">
            <Input
              className="border-slate-300/50 rounded-sm flex-1 active:soutline-0"
              value={saveLocation}
              readOnly
            />
            <button
              onClick={handleBrowse}
              className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors"
            >
              Browse
            </button>
          </div>
        </li>
      </ul>
    </div>
  )
}
