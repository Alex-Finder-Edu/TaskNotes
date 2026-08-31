import { Routes, Route } from 'react-router-dom'
import { NotesProvider } from './context/NotesContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Home from './pages/Home.jsx'
import NoteEditor from './pages/NoteEditor.jsx'
import GraphView from './pages/GraphView.jsx'

export default function App() {
  return (
    <NotesProvider>
      <Sidebar />
      <div className="app-content">
        <Topbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notes/new" element={<NoteEditor />} />
          <Route path="/notes/:noteId" element={<NoteEditor />} />
          <Route path="/graph" element={<GraphView />} />
        </Routes>
      </div>
    </NotesProvider>
  )
}
