import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { useSession } from "@/hooks/useAuth";

export type Role = "client" | "admin";

type RoleCtx = { role: Role; setRole: (r: Role) => void };

const Ctx = createContext<RoleCtx>({ role: "client", setRole: () => {} });

export const RoleProvider = ({ children }: { children: ReactNode }) => {
	const [role, setRole] = useState<Role>("client");
	const { data: session } = useSession();

	useEffect(() => {
		if (session?.user?.role) {
			setRole(session.user.role as Role);
		} else {
			setRole("client");
		}
	}, [session?.user?.role]);

	return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
};

export const useRole = () => useContext(Ctx);
