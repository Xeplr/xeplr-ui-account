import { Link } from 'react-router-dom';
import LoginForm from './LoginForm.jsx';
import './login.css';

// Five full-page login designs. Each takes the useLoginController props plus
// an optional `brand` ({ name, tagline, logo }) and fills the whole viewport
// with the theme's colours, so the page never shows bare background.
//
//   authRoutes({ login: { design: LoginDesign2, props: { brand: { name: 'Acme' } } } })

function BrandMark({ brand }) {
  if (brand && brand.logo) return <img className="xeplr-login-logo" src={brand.logo} alt="" />;
  var letter = ((brand && brand.name) || 'x').charAt(0).toUpperCase();
  return <span className="xeplr-login-mark" aria-hidden="true">{letter}</span>;
}

function brandName(brand) {
  return (brand && brand.name) || '';
}

// 1 — Card: an elevated card centred on a soft dotted page.
export function LoginDesign1(props) {
  var name = brandName(props.brand);
  return (
    <div className="xeplr-login xeplr-login-d1">
      <div className="xeplr-login-card">
        <BrandMark brand={props.brand} />
        <h1>{name ? 'Sign in to ' + name : 'Welcome back'}</h1>
        <p className="xeplr-login-sub">Enter your details to continue.</p>
        <LoginForm {...props} />
      </div>
    </div>
  );
}

// 2 — Split: a brand panel on the left, the form on the right.
export function LoginDesign2(props) {
  var brand = props.brand || {};
  return (
    <div className="xeplr-login xeplr-login-d2">
      <aside className="xeplr-login-panel">
        <div className="xeplr-login-panel-brand"><BrandMark brand={brand} /><span>{brand.name || 'Your workspace'}</span></div>
        <div className="xeplr-login-panel-copy">
          <h2>{brand.tagline || 'Everything your team needs, in one place.'}</h2>
        </div>
        <span className="xeplr-login-panel-foot">© {new Date().getFullYear()} {brand.name || ''}</span>
      </aside>
      <main className="xeplr-login-main">
        <div className="xeplr-login-inner">
          <h1>Welcome back</h1>
          <p className="xeplr-login-sub">Sign in to your account.</p>
          <LoginForm {...props} />
        </div>
      </main>
    </div>
  );
}

// 3 — Minimal: no card, a large heading and underlined fields.
export function LoginDesign3(props) {
  var name = brandName(props.brand);
  return (
    <div className="xeplr-login xeplr-login-d3">
      <div className="xeplr-login-inner">
        <span className="xeplr-login-eyebrow">{name || 'Sign in'}</span>
        <h1>Good to see you again.</h1>
        <LoginForm {...props} submitLabel="Continue" />
      </div>
    </div>
  );
}

// 4 — Glow: a frosted card over soft accent light.
export function LoginDesign4(props) {
  var name = brandName(props.brand);
  return (
    <div className="xeplr-login xeplr-login-d4">
      <span className="xeplr-login-glow xeplr-login-glow-a" aria-hidden="true" />
      <span className="xeplr-login-glow xeplr-login-glow-b" aria-hidden="true" />
      <div className="xeplr-login-card">
        <BrandMark brand={props.brand} />
        <h1>{name || 'Sign in'}</h1>
        <p className="xeplr-login-sub">{(props.brand && props.brand.tagline) || 'Sign in to pick up where you left off.'}</p>
        <LoginForm {...props} />
      </div>
    </div>
  );
}

// 5 — App bar: a product header, the form below it, a footer.
export function LoginDesign5(props) {
  var brand = props.brand || {};
  return (
    <div className="xeplr-login xeplr-login-d5">
      <header className="xeplr-login-bar">
        <div className="xeplr-login-panel-brand"><BrandMark brand={brand} /><span>{brand.name || 'Workspace'}</span></div>
        <Link className="xeplr-login-bar-action" to="/auth/register">Create account</Link>
      </header>
      <main className="xeplr-login-main">
        <div className="xeplr-login-card">
          <h1>Sign in</h1>
          <p className="xeplr-login-sub">Use your work email and password.</p>
          <LoginForm {...props} links={false} />
        </div>
      </main>
      <footer className="xeplr-login-footer">
        <span>© {new Date().getFullYear()} {brand.name || ''}</span>
        <Link to="/auth/forgot-password">Trouble signing in?</Link>
      </footer>
    </div>
  );
}
