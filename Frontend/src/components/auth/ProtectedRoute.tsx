import type { ReactNode, JSX } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "../../hooks/useAuth"
import { Spinner } from "../ui/Spinner"

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({
  children,
}: ProtectedRouteProps): JSX.Element => {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <Spinner size="lg" />
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
