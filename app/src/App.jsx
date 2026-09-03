import { Routes, Route } from 'react-router-dom'
import { NotesProvider } from './context/NotesContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Home from './pages/Home.jsx'
import NoteEditor from './pages/NoteEditor.jsx'
import GraphView from './pages/GraphView.jsx'
import Appearance from './pages/Appearance.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <NotesProvider>
        <Sidebar />
        <div className="app-content">
          <Topbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/notes/new" element={<NoteEditor />} />
            <Route path="/notes/:noteId" element={<NoteEditor />} />
            <Route path="/graph" element={<GraphView />} />
            <Route path="/appearance" element={<Appearance />} />
          </Routes>
        </div>
      </NotesProvider>
    </ThemeProvider>
  )
}
