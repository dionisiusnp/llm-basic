import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import TokenModule from './modules/01-token/TokenModule'
import TemperatureModule from './modules/02-temperature/TemperatureModule'
import SystemPromptModule from './modules/03-system-prompt/SystemPromptModule'
import ContextModule from './modules/04-context/ContextModule'
import ApiAnatomyModule from './modules/05-api-anatomy/ApiAnatomyModule'
import ArenaModule from './modules/06-arena/ArenaModule'
import StructuredOutputModule from './modules/07-structured-output/StructuredOutputModule'
import ToolCallingModule from './modules/08-tool-calling/ToolCallingModule'
import SummaryModule from './modules/09-summary/SummaryModule'
import { useAppStore } from './store/appStore'

const MODULE_MAP: Record<number, React.ComponentType> = {
  1: TokenModule,
  2: TemperatureModule,
  3: SystemPromptModule,
  4: ContextModule,
  5: ApiAnatomyModule,
  6: ArenaModule,
  7: StructuredOutputModule,
  8: ToolCallingModule,
  9: SummaryModule,
}

function ModuleRoute() {
  const { id } = useParams<{ id: string }>()
  const num = id ? parseInt(id) : 0
  const Component = MODULE_MAP[num]
  if (!Component) return <Navigate to="/modul/1" replace />
  return <Component />
}

export default function App() {
  const { presentationMode } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 49px)' }}>
        <Sidebar collapsed={presentationMode} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/modul/1" replace />} />
            <Route path="/modul/:id" element={<ModuleRoute />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
