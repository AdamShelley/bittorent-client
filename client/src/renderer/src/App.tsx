import { ModalProvider } from './components/ModalProvider/ModalProvider'
import Table from './components/Toolbar/Table'
import Toolbar from './components/Toolbar/Toolbar'
import { ThemeProvider } from './providers/theme-provider'

function App(): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <ModalProvider>
        <div className="w-screen h-screen">
          <div className="w-full h-full flex flex-col gap-2 p-4">
            <Toolbar />
            <Table />
            <div className="border border-pink-200 p-3 flex-2">Stats area</div>
          </div>
        </div>
      </ModalProvider>
    </ThemeProvider>
  )
}

export default App
