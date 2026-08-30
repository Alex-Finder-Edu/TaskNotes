import { Link } from 'react-router-dom'
import './Home.css'

export default function Home() {
  return (
    <main className="home">
      <Link to="/notes/new" className="new-note-button">
        + New Note
      </Link>
    </main>
  )
}
