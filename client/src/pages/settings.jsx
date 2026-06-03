import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import AppNav from '../components/AppNav';

function PageWrapper({ children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.45s cubic-bezier(.4,0,.2,1), transform 0.45s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

function Stagger({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s cubic-bezier(.4,0,.2,1), transform 0.5s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, login: updateUser, logout } = useAuth();
  const { dark } = useTheme();
  const d = dark;
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [nameMsg, setNameMsg] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setNameError('Name cannot be empty');
    setNameLoading(true); setNameError(''); setNameMsg('');
    try {
      const res = await api.put('/auth/update-name', { name });
      const token = localStorage.getItem('token');
      updateUser(token, res.data.user);
      setNameMsg('Name updated successfully');
    } catch (err) {
      setNameError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setPwError('Passwords do not match');
    if (newPassword.length < 6) return setPwError('Password must be at least 6 characters');
    setPwLoading(true); setPwError(''); setPwMsg('');
    try {
      await api.put('/auth/update-password', { currentPassword, newPassword });
      setPwMsg('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setPwLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
    d
      ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
      : 'bg-white border-gray-200 text-gray-900'
  }`

  const cardClass = `rounded-2xl border p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${
    d ? 'bg-gray-900 border-gray-800 hover:border-indigo-900' : 'bg-white border-gray-200 hover:border-indigo-200'
  }`

  return (
    <PageWrapper>
      <div className={`min-h-screen ${d ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <AppNav />

        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          <Stagger delay={50}>
            <div>
              <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Account management</p>
              <h1 className={`text-2xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
              <p className={`mt-1 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>Manage your profile and security</p>
            </div>
          </Stagger>

          {/* Profile Card */}
          <Stagger delay={125}>
            <div className={cardClass}>
              <h2 className={`text-lg font-semibold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Profile</h2>
              <p className={`text-sm mb-6 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Update your display name</p>
              <form onSubmit={handleNameUpdate} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                  <input
                    value={user?.email || ''}
                    disabled
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border cursor-not-allowed ${
                      d ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {nameMsg && <p className="text-sm text-green-500">{nameMsg}</p>}
                {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                <button
                  type="submit"
                  disabled={nameLoading}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {nameLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </Stagger>

          {/* Password Card */}
          <Stagger delay={200}>
            <div className={cardClass}>
              <h2 className={`text-lg font-semibold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Change Password</h2>
              <p className={`text-sm mb-6 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Update your password</p>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                {[
                  { label: 'Current Password', val: currentPassword, set: setCurrentPassword },
                  { label: 'New Password', val: newPassword, set: setNewPassword },
                  { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
                    <input
                      type="password"
                      value={val}
                      onChange={e => set(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
                {pwMsg && <p className="text-sm text-green-500">{pwMsg}</p>}
                {pwError && <p className="text-sm text-red-500">{pwError}</p>}
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </Stagger>

          {/* Danger Zone */}
          <Stagger delay={275}>
            <div className={`rounded-2xl border p-8 transition-all duration-200 hover:-translate-y-1 ${
              d ? 'bg-gray-900 border-red-900/40' : 'bg-white border-red-100'
            }`}>
              <h2 className="text-lg font-semibold text-red-500 mb-1">Danger Zone</h2>
              <p className={`text-sm mb-4 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Permanently log out of your account</p>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition ${
                  d
                    ? 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-950/70'
                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                }`}
              >
                Log Out
              </button>
            </div>
          </Stagger>
        </div>
      </div>
    </PageWrapper>
  )
}