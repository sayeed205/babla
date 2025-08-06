import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button.tsx'
import { useAuthStore } from '@/features/auth/stores/auth-store.ts'
import { ChartSpline, Settings, User } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/home')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user, logout, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Unable to load user data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              {user.avatar && (
                <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome, {user.firstName}!</h1>
                {user.username && <p className="text-sm text-gray-600">@{user.username}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  logout()
                  window.location.href = '/'
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dashboard Cards */}
          <div className="bg-muted rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <User />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-foreground">Profile</h3>
                <p className="text-sm text-gray-600">Manage your account settings</p>
              </div>
            </div>
          </div>

          <div className="bg-muted rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <ChartSpline />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-foreground">Analytics</h3>
                <p className="text-sm text-gray-600">View your usage statistics</p>
              </div>
            </div>
          </div>

          <div className="bg-muted rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <Settings className="" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-foreground">Settings</h3>
                <p className="text-sm text-muted-foreground">Configure your preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="mt-8 bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">User ID</label>
              <p className="mt-1 text-sm text-muted-foreground">{user.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">First Name</label>
              <p className="mt-1 text-sm text-muted-foreground">{user.firstName}</p>
            </div>
            {user.lastName && (
              <div>
                <label className="block text-sm font-medium text-foreground">Last Name</label>
                <p className="mt-1 text-sm text-foreground">{user.lastName}</p>
              </div>
            )}
            {user.username && (
              <div>
                <label className="block text-sm font-medium text-foreground">Username</label>
                <p className="mt-1 text-sm text-foreground">@{user.username}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
