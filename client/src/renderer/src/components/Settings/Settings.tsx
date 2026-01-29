import { Input } from '../ui/input'

export const Settings = () => {
  // Implement save file

  const defaultSettings: { [key: string]: string } = {
    saveLocation: '/downloads'
  }

  return (
    <div>
      <ul>
        <li className="flex flex-col gap-2">
          <h5>Save Location</h5>
          <Input className="border-slate-300/50 rounded-sm" value={defaultSettings.saveLocation} />
        </li>
      </ul>
    </div>
  )
}
