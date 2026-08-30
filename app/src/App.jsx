import { Routes, Route } from 'react-router-dom'
import Topbar from './components/Topbar.jsx'
import Home from './pages/Home.jsx'
import NoteEditor from './pages/NoteEditor.jsx'

export default function App() {
  return (
    <>
      <Topbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notes/new" element={<NoteEditor />} />
      </Routes>
    </>
  )
}
