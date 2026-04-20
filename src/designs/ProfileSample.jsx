import './auth.css';

export default function ProfileSample({
  form, error, success, loading, fetching, handleChange, handleSubmit
}) {
  if (fetching) {
    return (
      <div className="xeplr-auth-container">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="xeplr-auth-container">
      <h1>Profile</h1>
      {error && <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>}
      {success && <div className="xeplr-auth-alert xeplr-auth-alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-profile-name">Name</label>
          <input id="xeplr-profile-name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Your name" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-profile-email">Email</label>
          <input id="xeplr-profile-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Your email" disabled />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-profile-phone">Phone Number</label>
          <input id="xeplr-profile-phone" name="phoneNumber" type="text" value={form.phoneNumber} onChange={handleChange} placeholder="Your phone number" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
      </form>
    </div>
  );
}
