import { useEffect, useState } from 'react'
import { api } from './api/client'
import './App.css'

const initialRideForm = {
  pickupZone: '',
  destinationZone: '',
  seatsRequested: 1,
}

const initialRegisterForm = {
  name: '',
  email: '',
  password: '',
  role: 'PASSENGER',
}

const initialLoginForm = {
  email: '',
  password: '',
}

const initialVehicleForm = {
  name: '',
  model: '',
  capacity: 4,
}

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking backend...')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [authMode, setAuthMode] = useState(null)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)

  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)

  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    checkBackend()
    restoreSession()
  }, [])

  async function checkBackend() {
    try {
      const data = await api.get('/')
      setBackendStatus(data.message)
    } catch {
      setBackendStatus('Backend connection failed')
    }
  }

  async function restoreSession() {
    const token = localStorage.getItem('token')

    if (!token) {
      setAuthLoading(false)
      return
    }

    try {
      const data = await api.get('/api/auth/me')
      setUser(data.data.user)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }

  function clearMessages() {
    setError('')
    setNotice('')
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
    setAuthMode(null)
    clearMessages()
  }

  function openLogin() {
    clearMessages()
    setAuthMode('login')
  }

  function openRegister() {
    clearMessages()
    setAuthMode('register')
  }

  function closeAuth() {
    setAuthMode(null)
    clearMessages()
  }

  async function handleLogin(event) {
    event.preventDefault()

    clearMessages()
    setLoginLoading(true)

    try {
      const data = await api.post('/api/auth/login', loginForm)

      localStorage.setItem('token', data.data.token)
      setUser(data.data.user)
      setLoginForm(initialLoginForm)
      setAuthMode(null)
      setNotice('Login successful.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()

    clearMessages()
    setRegisterLoading(true)

    try {
      const data = await api.post('/api/auth/register', registerForm)

      localStorage.setItem('token', data.data.token)
      setUser(data.data.user)
      setRegisterForm(initialRegisterForm)
      setAuthMode(null)
      setNotice('Account created successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setRegisterLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading Dhaka Tesla Pool...</p>
      </div>
    )
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={logout}
        notice={notice}
        error={error}
        setNotice={setNotice}
        setError={setError}
      />
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container navbar-inner">
          <button className="brand brand-button" onClick={() => window.scrollTo(0, 0)}>
            <div className="brand-icon">D</div>
            <span>Dhaka Tesla Pool</span>
          </button>

          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#about">About</a>
            <button className="nav-login" onClick={openLogin}>
              Log In
            </button>
            <button className="nav-signup" onClick={openRegister}>
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="container hero-content">
            <div className="hero-text">
              <span className="eyebrow">
                RIDE TOGETHER. SAVE TOGETHER.
              </span>

              <h1>
                Smart ride sharing
                <br />
                for <span>Dhaka.</span>
              </h1>

              <p>
                Share your Tesla ride with people going the same way.
                Simple, affordable, and designed for everyday travel
                across Dhaka.
              </p>

              <QuickRideForm
                onLoginRequired={openLogin}
                setNotice={setNotice}
                setError={setError}
              />

              <div className="popular-routes">
                <span>Popular routes:</span>

                <button
                  onClick={openLogin}
                  type="button"
                >
                  Banani → Mohakhali
                </button>

                <button
                  onClick={openLogin}
                  type="button"
                >
                  Gulshan → Badda
                </button>

                <button
                  onClick={openLogin}
                  type="button"
                >
                  Mohakhali → Banani
                </button>
              </div>

              <div className="backend-status">
                <span
                  className={
                    backendStatus === 'Dhaka Tesla Pool API is running'
                      ? 'status-dot online'
                      : 'status-dot'
                  }
                ></span>

                <span>{backendStatus}</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-glow"></div>

              <div className="road-card">
                <div className="road-top">
                  <span>Dhaka</span>
                  <span>Today</span>
                </div>

                <div className="route-line">
                  <div className="route-point start"></div>

                  <div className="route-path">
                    <div className="route-car">🚗</div>
                  </div>

                  <div className="route-point end"></div>
                </div>

                <div className="road-labels">
                  <span>Banani</span>
                  <span>Mohakhali</span>
                </div>
              </div>

              <div className="floating-card card-one">
                <strong>৳110</strong>
                <span>Estimated fare</span>
              </div>

              <div className="floating-card card-two">
                <strong>3 seats</strong>
                <span>Available</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <div className="container stats">
            <div>
              <strong>4+</strong>
              <span>Dhaka zones</span>
            </div>

            <div>
              <strong>24/7</strong>
              <span>Ride requests</span>
            </div>

            <div>
              <strong>1</strong>
              <span>Shared journey</span>
            </div>

            <div>
              <strong>৳</strong>
              <span>Fare sharing</span>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="how-section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">HOW IT WORKS</span>

              <h2>
                One ride.
                <br />
                Multiple passengers.
              </h2>

              <p>
                Dhaka Tesla Pool connects passengers travelling along
                similar routes so they can share a ride and split the fare.
              </p>
            </div>

            <div className="steps">
              <div className="step-card">
                <div className="step-number">01</div>

                <h3>Request a ride</h3>

                <p>
                  Enter your pickup location, destination, and preferred
                  travel details.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">02</div>

                <h3>Join a pool</h3>

                <p>
                  Your request can be matched into an available ride pool
                  by the platform.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">03</div>

                <h3>Share the fare</h3>

                <p>
                  Travel together and split the ride cost between pool
                  members.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="about-section">
          <div className="container about-card">
            <div>
              <span className="eyebrow">BUILT FOR DHAKA</span>

              <h2>
                From Banani to Badda,
                <br />
                ride smarter.
              </h2>
            </div>

            <p>
              Dhaka Tesla Pool is designed around shared mobility in
              Dhaka's busy neighborhoods. The platform focuses on simple
              ride requests, pool formation, transparent fares, and a
              smooth passenger experience.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <div className="brand">
            <div className="brand-icon">D</div>
            <span>Dhaka Tesla Pool</span>
          </div>

          <p>Built for smarter rides in Dhaka.</p>
        </div>
      </footer>

      {notice && (
        <Toast
          type="success"
          message={notice}
          onClose={() => setNotice('')}
        />
      )}

      {error && (
        <Toast
          type="error"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {authMode && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={closeAuth}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          registerForm={registerForm}
          setRegisterForm={setRegisterForm}
          onLogin={handleLogin}
          onRegister={handleRegister}
          loginLoading={loginLoading}
          registerLoading={registerLoading}
        />
      )}
    </div>
  )
}

function QuickRideForm({ onLoginRequired }) {
  const [pickupZone, setPickupZone] = useState('')
  const [destinationZone, setDestinationZone] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onLoginRequired()
  }

  return (
    <form className="search-card" onSubmit={handleSubmit}>
      <div className="location-field">
        <div className="location-dot pickup-dot"></div>

        <div className="field-content">
          <label>Pickup</label>
          <input
            type="text"
            placeholder="e.g. Banani"
            value={pickupZone}
            onChange={(event) => setPickupZone(event.target.value)}
          />
        </div>
      </div>

      <div className="field-divider"></div>

      <div className="location-field">
        <div className="location-dot dropoff-dot"></div>

        <div className="field-content">
          <label>Destination</label>
          <input
            type="text"
            placeholder="e.g. Mohakhali"
            value={destinationZone}
            onChange={(event) => setDestinationZone(event.target.value)}
          />
        </div>
      </div>

      <button className="search-button" type="submit">
        Find a Ride
      </button>
    </form>
  )
}

function AuthModal({
  mode,
  setMode,
  onClose,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  onLogin,
  onRegister,
  loginLoading,
  registerLoading,
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="auth-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="auth-header">
          <div className="brand-icon large">D</div>

          <span className="eyebrow">
            DHAKA TESLA POOL
          </span>

          <h2>
            {mode === 'login'
              ? 'Welcome back.'
              : 'Create your account.'}
          </h2>

          <p>
            {mode === 'login'
              ? 'Log in to manage your rides.'
              : 'Join Dhaka Tesla Pool and start sharing rides.'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={onLogin} className="auth-form">
            <label>
              Email
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    email: event.target.value,
                  })
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    password: event.target.value,
                  })
                }
                placeholder="Your password"
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={loginLoading}
            >
              {loginLoading ? 'Logging in...' : 'Log In'}
            </button>

            <div className="auth-switch">
              Don't have an account?
              <button
                type="button"
                onClick={() => setMode('register')}
              >
                Create one
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onRegister} className="auth-form">
            <label>
              Name
              <input
                type="text"
                required
                minLength="2"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    name: event.target.value,
                  })
                }
                placeholder="Your name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                required
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    email: event.target.value,
                  })
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                minLength="8"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    password: event.target.value,
                  })
                }
                placeholder="Minimum 8 characters"
              />
            </label>

            <label>
              Account type
              <select
                value={registerForm.role}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    role: event.target.value,
                  })
                }
              >
                <option value="PASSENGER">Passenger</option>
                <option value="DRIVER">Driver</option>
              </select>
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={registerLoading}
            >
              {registerLoading
                ? 'Creating account...'
                : 'Create Account'}
            </button>

            <div className="auth-switch">
              Already have an account?
              <button
                type="button"
                onClick={() => setMode('login')}
              >
                Log in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Dashboard({
  user,
  onLogout,
  notice,
  error,
  setNotice,
  setError,
}) {
  const [activeView, setActiveView] = useState('overview')

  return (
    <div className="dashboard-page">
      <nav className="dashboard-navbar">
        <div className="container dashboard-nav-inner">
          <div className="brand">
            <div className="brand-icon">D</div>
            <span>Dhaka Tesla Pool</span>
          </div>

          <div className="dashboard-user">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>

            <button
              className="logout-button"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-layout container">
        <aside className="dashboard-sidebar">
          <div className="sidebar-role">
            <span className="eyebrow">
              {user.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER'}
            </span>
            <h2>
              {user.role === 'DRIVER'
                ? 'Driver Center'
                : 'Your Rides'}
            </h2>
          </div>

          <button
            className={
              activeView === 'overview'
                ? 'sidebar-link active'
                : 'sidebar-link'
            }
            onClick={() => setActiveView('overview')}
          >
            Overview
          </button>

          {user.role === 'PASSENGER' ? (
            <>
              <button
                className={
                  activeView === 'request'
                    ? 'sidebar-link active'
                    : 'sidebar-link'
                }
                onClick={() => setActiveView('request')}
              >
                Request Ride
              </button>

              <button
                className={
                  activeView === 'rides'
                    ? 'sidebar-link active'
                    : 'sidebar-link'
                }
                onClick={() => setActiveView('rides')}
              >
                My Rides
              </button>
            </>
          ) : (
            <>
              <button
                className={
                  activeView === 'vehicle'
                    ? 'sidebar-link active'
                    : 'sidebar-link'
                }
                onClick={() => setActiveView('vehicle')}
              >
                My Vehicle
              </button>

              <button
                className={
                  activeView === 'requests'
                    ? 'sidebar-link active'
                    : 'sidebar-link'
                }
                onClick={() => setActiveView('requests')}
              >
                Ride Requests
              </button>

              <button
                className={
                  activeView === 'driver-rides'
                    ? 'sidebar-link active'
                    : 'sidebar-link'
                }
                onClick={() => setActiveView('driver-rides')}
              >
                My Rides
              </button>
            </>
          )}
        </aside>

        <main className="dashboard-main">
          {notice && (
            <div className="dashboard-alert success">
              {notice}
              <button onClick={() => setNotice('')}>×</button>
            </div>
          )}

          {error && (
            <div className="dashboard-alert error">
              {error}
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {user.role === 'PASSENGER' && (
            <PassengerDashboard
              activeView={activeView}
              setActiveView={setActiveView}
              setNotice={setNotice}
              setError={setError}
            />
          )}

          {user.role === 'DRIVER' && (
            <DriverDashboard
              activeView={activeView}
              setActiveView={setActiveView}
              setNotice={setNotice}
              setError={setError}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function PassengerDashboard({
  activeView,
  setActiveView,
  setNotice,
  setError,
}) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeView === 'overview' || activeView === 'rides') {
      loadRides()
    }
  }, [activeView])

  async function loadRides() {
    setLoading(true)

    try {
      const data = await api.get('/api/rides')
      setRides(data.data.rides || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function cancelRide(rideId) {
    if (!window.confirm('Cancel this ride request?')) {
      return
    }

    try {
      const data = await api.post(`/api/rides/${rideId}/cancel`)

      setNotice(
        data.message || 'Ride cancelled successfully.',
      )

      await loadRides()
    } catch (err) {
      setError(err.message)
    }
  }

  if (activeView === 'request') {
    return (
      <PassengerRideRequest
        onCreated={async () => {
          setNotice('Ride request created successfully.')
          setActiveView('rides')
          await loadRides()
        }}
        setError={setError}
      />
    )
  }

  return (
    <section>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">PASSENGER</span>

          <h1>
            {activeView === 'rides'
              ? 'My rides'
              : 'Welcome back.'}
          </h1>

          <p>
            {activeView === 'rides'
              ? 'View and manage your ride requests.'
              : 'Request a ride and manage your journeys from one place.'}
          </p>
        </div>

        <button
          className="primary-button compact"
          onClick={() => setActiveView('request')}
        >
          + Request Ride
        </button>
      </div>

      {activeView === 'overview' && (
        <div className="dashboard-cards">
          <div className="metric-card">
            <span>Total Requests</span>
            <strong>{rides.length}</strong>
          </div>

          <div className="metric-card">
            <span>Active Requests</span>
            <strong>
              {
                rides.filter(
                  (ride) =>
                    !['COMPLETED', 'CANCELLED'].includes(
                      ride.status,
                    ),
                ).length
              }
            </strong>
          </div>

          <div className="metric-card">
            <span>Completed</span>
            <strong>
              {
                rides.filter(
                  (ride) => ride.status === 'COMPLETED',
                ).length
              }
            </strong>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="content-card-header">
          <div>
            <span className="eyebrow">RIDE REQUESTS</span>
            <h2>
              {activeView === 'rides'
                ? 'Your ride history'
                : 'Recent rides'}
            </h2>
          </div>

          <button
            className="secondary-button"
            onClick={loadRides}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <EmptyState text="Loading rides..." />
        ) : rides.length === 0 ? (
          <EmptyState
            text="You have not requested any rides yet."
            actionText="Request your first ride"
            onAction={() => setActiveView('request')}
          />
        ) : (
          <div className="ride-list">
            {rides.map((ride) => (
              <PassengerRideCard
                key={ride.id}
                ride={ride}
                onCancel={cancelRide}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PassengerRideRequest({ onCreated, setError }) {
  const [form, setForm] = useState(initialRideForm)
  const [loading, setLoading] = useState(false)

  async function submitRide(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await api.post('/api/rides', {
        pickupZone: form.pickupZone.trim(),
        destinationZone: form.destinationZone.trim(),
        seatsRequested: Number(form.seatsRequested),
      })

      setForm(initialRideForm)
      await onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">NEW REQUEST</span>
          <h1>Request a ride</h1>
          <p>
            Enter your route and number of seats required.
          </p>
        </div>
      </div>

      <div className="content-card form-card">
        <form onSubmit={submitRide} className="dashboard-form">
          <label>
            Pickup zone
            <input
              required
              minLength="2"
              maxLength="100"
              value={form.pickupZone}
              onChange={(event) =>
                setForm({
                  ...form,
                  pickupZone: event.target.value,
                })
              }
              placeholder="e.g. Banani"
            />
          </label>

          <label>
            Destination zone
            <input
              required
              minLength="2"
              maxLength="100"
              value={form.destinationZone}
              onChange={(event) =>
                setForm({
                  ...form,
                  destinationZone: event.target.value,
                })
              }
              placeholder="e.g. Mohakhali"
            />
          </label>

          <label>
            Seats requested
            <input
              type="number"
              min="1"
              max="10"
              required
              value={form.seatsRequested}
              onChange={(event) =>
                setForm({
                  ...form,
                  seatsRequested: event.target.value,
                })
              }
            />
          </label>

          <div className="form-note">
            <strong>How matching works</strong>
            <p>
              This creates a ride request in the backend. A compatible
              driver/pool can then accept or match the request.
            </p>
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating request...' : 'Create Ride Request'}
          </button>
        </form>
      </div>
    </section>
  )
}

function PassengerRideCard({ ride, onCancel }) {
  const canCancel = ![
    'COMPLETED',
    'CANCELLED',
  ].includes(ride.status)

  return (
    <div className="ride-card">
      <div className="ride-card-main">
        <div className="route-summary">
          <div>
            <span>Pickup</span>
            <strong>{ride.pickupZone}</strong>
          </div>

          <div className="route-arrow">→</div>

          <div>
            <span>Destination</span>
            <strong>{ride.destinationZone}</strong>
          </div>
        </div>

        <div className="ride-meta">
          <span>
            {ride.seatsRequested} seat
            {ride.seatsRequested === 1 ? '' : 's'}
          </span>

          {ride.createdAt && (
            <span>
              {new Date(ride.createdAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="ride-card-side">
        <StatusBadge status={ride.status} />

        {canCancel && (
          <button
            className="danger-button"
            onClick={() => onCancel(ride.id)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function DriverDashboard({
  activeView,
  setActiveView,
  setNotice,
  setError,
}) {
  const [vehicle, setVehicle] = useState(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [rides, setRides] = useState([])

  useEffect(() => {
    loadVehicle()
    loadRequests()
    loadDriverRides()
  }, [])

  async function loadVehicle() {
    setVehicleLoading(true)

    try {
      const data = await api.get('/api/vehicles/me')
      setVehicle(data.data.vehicle)
    } catch (err) {
      if (!err.message.toLowerCase().includes('vehicle not found')) {
        setError(err.message)
      }

      setVehicle(null)
    } finally {
      setVehicleLoading(false)
    }
  }

  async function loadRequests() {
    try {
      const data = await api.get('/api/drivers/requests')
      setRequests(data.data.rides || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadDriverRides() {
    try {
      const data = await api.get('/api/drivers/rides')
      setRides(data.data.rides || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function updateVehicleStatus(isOnline) {
    try {
      const data = await api.patch('/api/vehicles/me/status', {
        isOnline,
      })

      setVehicle(data.data.vehicle)

      setNotice(
        isOnline
          ? 'Vehicle is now online.'
          : 'Vehicle is now offline.',
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRefresh() {
    await Promise.all([
      loadVehicle(),
      loadRequests(),
      loadDriverRides(),
    ])

    setNotice('Driver data refreshed.')
  }

  if (activeView === 'vehicle') {
    return (
      <DriverVehicle
        vehicle={vehicle}
        loading={vehicleLoading}
        onVehicleCreated={(newVehicle) => {
          setVehicle(newVehicle)
          setNotice('Vehicle created successfully.')
        }}
        onStatusChange={updateVehicleStatus}
        setError={setError}
      />
    )
  }

  if (activeView === 'requests') {
    return (
      <DriverRequests
        requests={requests}
        onRefresh={loadRequests}
        onAccept={async (rideId) => {
          try {
            const data = await api.post(
              `/api/drivers/rides/${rideId}/accept`,
            )

            setNotice(
              data.message || 'Ride accepted successfully.',
            )

            await loadRequests()
            await loadDriverRides()
          } catch (err) {
            setError(err.message)
          }
        }}
      />
    )
  }

  if (activeView === 'driver-rides') {
    return (
      <DriverRides
        rides={rides}
        onRefresh={loadDriverRides}
        onAction={async (rideId, action) => {
          try {
            const data = await api.post(
              `/api/drivers/rides/${rideId}/${action}`,
            )

            setNotice(data.message || 'Ride updated successfully.')

            await loadDriverRides()
            await loadRequests()
          } catch (err) {
            setError(err.message)
          }
        }}
        onMatch={async (rideId) => {
          try {
            const data = await api.post(
              `/api/pools/rides/${rideId}/match`,
            )

            setNotice(
              data.message || 'Ride matched successfully.',
            )

            await loadDriverRides()
            await loadRequests()
          } catch (err) {
            setError(err.message)
          }
        }}
      />
    )
  }

  return (
    <section>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">DRIVER</span>
          <h1>Driver Center</h1>
          <p>
            Manage your vehicle, requests, and active rides.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={handleRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="dashboard-cards">
        <div className="metric-card">
          <span>Vehicle</span>
          <strong>
            {vehicleLoading
              ? '...'
              : vehicle
                ? 'Ready'
                : 'Not set'}
          </strong>
        </div>

        <div className="metric-card">
          <span>Ride Requests</span>
          <strong>{requests.length}</strong>
        </div>

        <div className="metric-card">
          <span>My Rides</span>
          <strong>{rides.length}</strong>
        </div>
      </div>

      <div className="driver-overview-grid">
        <div className="content-card">
          <div className="content-card-header">
            <div>
              <span className="eyebrow">VEHICLE</span>
              <h2>Vehicle status</h2>
            </div>

            {vehicle && (
              <StatusBadge
                status={
                  vehicle.isOnline ? 'ONLINE' : 'OFFLINE'
                }
              />
            )}
          </div>

          {vehicle ? (
            <div className="vehicle-summary">
              <strong>{vehicle.name}</strong>
              <span>{vehicle.model}</span>
              <span>
                Capacity: {vehicle.capacity} seats
              </span>

              <div className="vehicle-actions">
                {vehicle.isOnline ? (
                  <button
                    className="secondary-button"
                    onClick={() => updateVehicleStatus(false)}
                  >
                    Go Offline
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() => updateVehicleStatus(true)}
                  >
                    Go Online
                  </button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              text="Create your vehicle before accepting rides."
              actionText="Set up vehicle"
              onAction={() => setActiveView('vehicle')}
            />
          )}
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <div>
              <span className="eyebrow">REQUESTS</span>
              <h2>Incoming rides</h2>
            </div>

            <button
              className="secondary-button"
              onClick={() => setActiveView('requests')}
            >
              View all
            </button>
          </div>

          {requests.length === 0 ? (
            <EmptyState text="No ride requests available." />
          ) : (
            <div className="mini-list">
              {requests.slice(0, 3).map((ride) => (
                <div className="mini-list-item" key={ride.id}>
                  <div>
                    <strong>
                      {ride.pickupZone} → {ride.destinationZone}
                    </strong>
                    <span>
                      {ride.seatsRequested} seat
                      {ride.seatsRequested === 1 ? '' : 's'}
                    </span>
                  </div>

                  <StatusBadge status={ride.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function DriverVehicle({
  vehicle,
  loading,
  onVehicleCreated,
  onStatusChange,
  setError,
}) {
  const [form, setForm] = useState(initialVehicleForm)
  const [creating, setCreating] = useState(false)

  async function createVehicle(event) {
    event.preventDefault()

    setError('')
    setCreating(true)

    try {
      const data = await api.post('/api/vehicles', {
        name: form.name.trim(),
        model: form.model.trim(),
        capacity: Number(form.capacity),
      })

      onVehicleCreated(data.data.vehicle)
      setForm(initialVehicleForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <section>
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">VEHICLE</span>
            <h1>My Vehicle</h1>
          </div>
        </div>

        <div className="content-card">
          <EmptyState text="Loading vehicle..." />
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">VEHICLE</span>
          <h1>My Vehicle</h1>
          <p>
            Register the Tesla you use for shared rides.
          </p>
        </div>
      </div>

      {vehicle ? (
        <div className="content-card">
          <div className="vehicle-detail">
            <div className="vehicle-icon">🚗</div>

            <div className="vehicle-detail-info">
              <span className="eyebrow">REGISTERED VEHICLE</span>
              <h2>{vehicle.name}</h2>
              <p>{vehicle.model}</p>
              <span>
                Capacity: {vehicle.capacity} passengers
              </span>
            </div>

            <StatusBadge
              status={vehicle.isOnline ? 'ONLINE' : 'OFFLINE'}
            />
          </div>

          <div className="vehicle-actions large">
            {vehicle.isOnline ? (
              <button
                className="secondary-button"
                onClick={() => onStatusChange(false)}
              >
                Set Offline
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() => onStatusChange(true)}
              >
                Set Online
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="content-card form-card">
          <div className="form-intro">
            <span className="eyebrow">FIRST STEP</span>
            <h2>Register your vehicle</h2>
            <p>
              You need a vehicle before the backend can make you
              available for ride matching.
            </p>
          </div>

          <form onSubmit={createVehicle} className="dashboard-form">
            <label>
              Vehicle name
              <input
                required
                minLength="2"
                maxLength="100"
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                placeholder="e.g. Arnob's Tesla"
              />
            </label>

            <label>
              Model
              <input
                required
                minLength="2"
                maxLength="100"
                value={form.model}
                onChange={(event) =>
                  setForm({
                    ...form,
                    model: event.target.value,
                  })
                }
                placeholder="e.g. Model 3"
              />
            </label>

            <label>
              Passenger capacity
              <input
                type="number"
                required
                min="1"
                max="10"
                value={form.capacity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    capacity: event.target.value,
                  })
                }
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={creating}
            >
              {creating
                ? 'Creating vehicle...'
                : 'Create Vehicle'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}

function DriverRequests({
  requests,
  onRefresh,
  onAccept,
}) {
  return (
    <section>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">DRIVER</span>
          <h1>Ride Requests</h1>
          <p>
            Review passenger requests available to your vehicle.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="content-card">
        {requests.length === 0 ? (
          <EmptyState text="No ride requests available right now." />
        ) : (
          <div className="ride-list">
            {requests.map((ride) => (
              <div className="ride-card" key={ride.id}>
                <div className="ride-card-main">
                  <div className="route-summary">
                    <div>
                      <span>Pickup</span>
                      <strong>{ride.pickupZone}</strong>
                    </div>

                    <div className="route-arrow">→</div>

                    <div>
                      <span>Destination</span>
                      <strong>
                        {ride.destinationZone}
                      </strong>
                    </div>
                  </div>

                  <div className="ride-meta">
                    <span>
                      {ride.seatsRequested} seat
                      {ride.seatsRequested === 1
                        ? ''
                        : 's'}
                    </span>
                  </div>
                </div>

                <div className="ride-card-side">
                  <StatusBadge status={ride.status} />

                  {ride.status === 'REQUESTED' && (
                    <button
                      className="primary-button compact"
                      onClick={() => onAccept(ride.id)}
                    >
                      Accept
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function DriverRides({
  rides,
  onRefresh,
  onAction,
  onMatch,
}) {
  return (
    <section>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">DRIVER</span>
          <h1>My Rides</h1>
          <p>
            Manage the lifecycle of your assigned rides.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="content-card">
        {rides.length === 0 ? (
          <EmptyState text="You have no assigned rides yet." />
        ) : (
          <div className="ride-list">
            {rides.map((ride) => (
              <DriverRideCard
                key={ride.id}
                ride={ride}
                onAction={onAction}
                onMatch={onMatch}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function DriverRideCard({
  ride,
  onAction,
  onMatch,
}) {
  const status = ride.status

  return (
    <div className="driver-ride-card">
      <div className="driver-ride-top">
        <div>
          <span className="eyebrow">RIDE</span>

          <h3>
            {ride.pickupZone} → {ride.destinationZone}
          </h3>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="driver-ride-details">
        <span>
          Seats requested: {ride.seatsRequested}
        </span>

        {ride.id && (
          <span className="ride-id">
            ID: {ride.id}
          </span>
        )}
      </div>

      <div className="driver-action-row">
        {status === 'REQUESTED' && (
          <button
            className="secondary-button"
            onClick={() => onMatch(ride.id)}
          >
            Match Pool
          </button>
        )}

        {status === 'MATCHED' && (
          <button
            className="primary-button"
            onClick={() => onAction(ride.id, 'arrive')}
          >
            Mark Arrived
          </button>
        )}

        {status === 'DRIVER_ARRIVED' && (
          <button
            className="primary-button"
            onClick={() => onAction(ride.id, 'start')}
          >
            Start Ride
          </button>
        )}

        {status === 'IN_PROGRESS' && (
          <button
            className="primary-button"
            onClick={() => onAction(ride.id, 'complete')}
          >
            Complete Ride
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const label = String(status || 'UNKNOWN')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  const normalized = String(status || '').toLowerCase()

  let className = 'status-badge'

  if (
    normalized.includes('complete') ||
    normalized.includes('online')
  ) {
    className += ' positive'
  } else if (
    normalized.includes('cancel') ||
    normalized.includes('offline')
  ) {
    className += ' negative'
  } else if (
    normalized.includes('progress') ||
    normalized.includes('arrived') ||
    normalized.includes('matched')
  ) {
    className += ' active'
  } else {
    className += ' neutral'
  }

  return (
    <span className={className}>
      {label}
    </span>
  )
}

function EmptyState({
  text,
  actionText,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">⌁</div>
      <p>{text}</p>

      {actionText && (
        <button
          className="secondary-button"
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  )
}

function Toast({ type, message, onClose }) {
  return (
    <div className={`toast ${type}`}>
      <span>{message}</span>

      <button onClick={onClose}>
        ×
      </button>
    </div>
  )
}

export default App