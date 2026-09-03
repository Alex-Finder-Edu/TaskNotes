import { Routes, Route } from 'react-router-dom'
import { NotesProvider } from './context/NotesContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { TasksProvider } from './context/TasksContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Home from './pages/Home.jsx'
import NoteEditor from './pages/NoteEditor.jsx'
import GraphView from './pages/GraphView.jsx'
import Appearance from './pages/Appearance.jsx'
import Tasks from './pages/Tasks.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <NotesProvider>
        <TasksProvider>
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
            </Routes>
          </div>
        </TasksProvider>
      </NotesProvider>
    </ThemeProvider>
  )
}
