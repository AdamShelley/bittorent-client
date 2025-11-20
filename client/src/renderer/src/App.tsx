import Table from './components/Toolbar/Table'
import Toolbar from './components/Toolbar/Toolbar'

function App(): React.JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div className="w-screen h-screen">
      <div className="w-full h-full flex flex-col gap-2">
        <Toolbar />
        <Table />
        <div className="border border-pink-200 p-3 flex-2">Stats area</div>
      </div>
    </div>
  )
}

export default App
