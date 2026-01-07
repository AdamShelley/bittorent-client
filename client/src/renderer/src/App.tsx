import { ModalProvider } from './components/ModalProvider/ModalProvider'
import Table from './components/download-table/Table'
import Toolbar from './components/Toolbar/Toolbar'
import { ThemeProvider } from './providers/theme-provider'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import { AppSidebar } from './components/Sidebar/app-sidebar'

function App(): React.JSX.Element {
  return (
    <SidebarProvider>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <AppSidebar />
        <ModalProvider>
          <div className="w-screen h-screen img-container">
            <SidebarTrigger />
            <div className="w-full h-full flex flex-col align-start justify-start gap-2 p-4">
              <Toolbar />
              <Table />
              {/* <div className="flex-2">Stats area</div> */}
            </div>
          </div>
        </ModalProvider>
      </ThemeProvider>
    </SidebarProvider>
  )
}

export default App
