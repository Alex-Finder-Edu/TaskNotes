import { Link } from 'react-router-dom'
import './Topbar.css'

export default function Topbar() {
  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        NoteTasks
      </Link>
    </header>
  )
}
