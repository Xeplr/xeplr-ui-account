import { NavLink } from 'react-router-dom';
import { ADMIN_PAGES } from '../adminPaths.js';
import './admin.css';

/**
 * The admin view's own navigation: User Roles · Access Matrix · Master
 * Settings, one click apart. Rendered at the top of each admin page's design.
 */
export default function AdminTabs() {
  return (
    <nav className="xeplr-admin-pages" aria-label="Admin pages">
      {ADMIN_PAGES.map(function(page) {
        return (
          <NavLink key={page.key} to={page.path} end
            className={function(s) { return 'xeplr-admin-page-link' + (s.isActive ? ' xeplr-admin-page-link-active' : ''); }}>
            {page.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
