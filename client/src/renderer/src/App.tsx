import Dashboard from './components/Dashboard/Dashboard'

function App(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen flex-col">
      {/* Top drag bar for window movement */}
      <div className="drag-region fixed top-0 left-0 right-0 h-7 z-50" />
      <div className="flex-1 pt-7">
        <Dashboard />
      </div>
    </div>
  )
}

export default App
