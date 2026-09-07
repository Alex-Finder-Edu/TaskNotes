import { Routes, Route } from 'react-router-dom'
import { NotesProvider } from './context/NotesContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { TasksProvider } from './context/TasksContext.jsx'
import { LogProvider } from './context/LogContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Home from './pages/Home.jsx'
import NoteEditor from './pages/NoteEditor.jsx'
import GraphView from './pages/GraphView.jsx'
import Appearance from './pages/Appearance.jsx'
import Tasks from './pages/Tasks.jsx'
import Log from './pages/Log.jsx'
import LogCalendar from './pages/LogCalendar.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <NotesProvider>
        <TasksProvider>
          <LogProvider>
            <Sidebar />
            <div className="app-content">
              <Topbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/notes/new" element={<NoteEditor />} />
                <Route path="/notes/:noteId" element={<NoteEditor />} />
                <Route path="/graph" element={<GraphView />} />
                <Route path="/appearance" element={<Appearance />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/log" element={<Log />} />
                <Route path="/log/calendar" element={<LogCalendar />} />
              </Routes>
            </div>
          </LogProvider>
        </TasksProvider>
      </NotesProvider>
    </ThemeProvider>
  )
}
