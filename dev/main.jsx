import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom'
import { configure, AccessProvider, ThemeProvider, NavPage } from '../src/index.js'
import '../src/designs/theme.css'
import './dev.css'

// A STAND-IN HOST for the nav, laid out the way an app made by @xeplr/cli is:
// NavPage beside the routed page, the page leaving room for the rail (or, on
// a phone, the bar). Signed in from localStorage like a real session; the
// one call the nav makes (/auth/api/me) is answered by whoever runs this —
// test/phone.check.js answers it in the browser. Not published.

configure('')

const icon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
)
const PAGES = ['Home', 'Tasks', 'Employees', 'Journey']

function Layout() {
  const navigate = useNavigate()
  const drawerItems = PAGES.map((name) => ({ name, icon, path: '/' + name.toLowerCase(), clickHandler: () => navigate('/' + name.toLowerCase()) }))
  return (
    <div className="dev-app">
      <NavPage logo="/logo.svg" drawerItems={drawerItems} notifications={{ count: 3 }} />
      <main className="dev-main"><Outlet /></main>
    </div>
  )
}

function Page({ name }) {
  return (
    <div>
      <h1>{name}</h1>
      <p>The page under the nav. On a phone the bar sits above this, never over it.</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AccessProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Page name="Home" />} />
              {PAGES.map((p) => <Route key={p} path={p.toLowerCase()} element={<Page name={p} />} />)}
            </Route>
          </Routes>
        </AccessProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
