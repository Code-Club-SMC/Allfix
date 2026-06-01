import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/useAuth";

/**
 * Wraps admin routes. Redirects to /admin/login if:
 * - The session request fails (unauthenticated)
 * - The authenticated user is not an admin
 *
 * Shows a full-screen spinner while the session is loading.
 */
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
	const location = useLocation();
	const { data: session, isLoading, isError } = useSession();

	if (isLoading) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-background">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
			</div>
		);
	}

	if (isError || !session?.user || session.user.role !== "admin") {
		return <Navigate to="/admin/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
};
