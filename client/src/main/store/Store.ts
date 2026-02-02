import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface Settings {
  saveLocation: string
}

export class Store {
  private settingsFilePath: string
  private settings: Settings

  constructor() {
    const userDataPath = app.getPath('userData')
    this.settingsFilePath = path.join(userDataPath, 'app-settings.json')
    this.settings = this.loadSettings()
  }

  private getDefaults(): Settings {
    return {
      saveLocation: app.getPath('downloads')
    }
  }

  private loadSettings(): Settings {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const data = fs.readFileSync(this.settingsFilePath, 'utf-8')
        return { ...this.getDefaults(), ...JSON.parse(data) }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
    return this.getDefaults()
  }

  private saveSettings(): void {
    try {
      const userDataPath = app.getPath('userData')
      fs.mkdirSync(userDataPath, { recursive: true })
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(this.settings, null, 2))
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key]
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value
    this.saveSettings()
  }

  getAll(): Settings {
    return { ...this.settings }
  }
}

export const store = new Store()
