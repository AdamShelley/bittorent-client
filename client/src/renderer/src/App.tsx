import { ModalProvider } from './components/ModalProvider/ModalProvider'
import { ThemeProvider } from './providers/theme-provider'
import { Dashboard } from './components/Dashboard/dashboard'

function App(): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <ModalProvider>
        <main className="flex">
          <Dashboard />
        </main>
      </ModalProvider>
    </ThemeProvider>
  )
}

export default App
