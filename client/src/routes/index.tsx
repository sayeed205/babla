import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/hooks/use-auth'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Give some time for auth initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingAuth(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Welcome to Your App</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              A modern web application with secure Telegram authentication. Access your personalized
              dashboard and manage your content seamlessly.
            </p>
          </div>

          {/* Auth Status Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            {isAuthenticated && user ? (
              // Authenticated User
              <div className="space-y-6">
                <div className="flex items-center justify-center space-x-4">
                  {user.avatar && (
                    <img src={user.avatar} alt="Profile" className="w-16 h-16 rounded-full" />
                  )}
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Welcome back, {user.firstName}!
                    </h2>
                    {user.username && <p className="text-gray-600">@{user.username}</p>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/dashboard">
                    <Button size="lg" className="w-full sm:w-auto">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      // Add logout functionality
                      const { logout } = require('../features/auth/hooks/use-auth')
                      logout()
                      window.location.reload()
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              // Unauthenticated User
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
                  <p className="text-gray-600 mb-6">
                    Sign in with your Telegram account to access all features and your personalized
                    dashboard.
                  </p>
                </div>

                <Link to="/login">
                  <Button size="lg" className="w-full sm:w-auto">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.896 6.728-1.268 8.368-1.268 8.368-.159.708-.534.708-.534.708s-2.697-.534-3.761-1.011c-.534-.239-2.697-1.268-3.761-1.507-.534-.159-.896-.477-.896-.896 0-.419.362-.737.896-.896 1.064-.318 2.697-.896 3.761-1.268.534-.186 1.268-.534 1.268-1.268 0-.534-.534-.896-1.268-.896-1.064 0-2.697.534-3.761.896-.534.186-1.268.534-1.268 1.268 0 .534.534.896 1.268.896 1.064 0 2.697-.534 3.761-.896.534-.186 1.268-.534 1.268-1.268 0-.534-.534-.896-1.268-.896z" />
                    </svg>
                    Sign in with Telegram
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Authentication</h3>
              <p className="text-gray-600">
                Login securely using your Telegram account with OAuth 2.0 authentication.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Dashboard</h3>
              <p className="text-gray-600">
                Access your personalized dashboard with all your data and settings.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast & Modern</h3>
              <p className="text-gray-600">
                Built with modern technologies for a fast and responsive user experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
