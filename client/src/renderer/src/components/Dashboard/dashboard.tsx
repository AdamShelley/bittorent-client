import Table from '../download-table/Table'
import { AppSidebar } from '../Sidebar/app-sidebar'
import Toolbar from '../Toolbar/Toolbar'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable'

export const Dashboard = () => {
  return (
    <div className="w-screen h-screen img-container">
      <Toolbar />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25}>
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={85}>
          <div className="flex flex-col align-start justify-start h-full">
            <Table />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
