import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/hooks/useAuth";

const Login = () => {
	const navigate = useNavigate();
	const { mutate: login, isPending, error } = useLogin();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [wrongRole, setWrongRole] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setWrongRole(false);
		login(
			{ email, password },
			{
				onSuccess: (data) => {
					if (data.user.role !== "admin") {
						setWrongRole(true);
						setPassword("");
						return;
					}
					navigate("/admin", { replace: true });
				},
			},
		);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-[380px]">
				<div className="mb-8 flex flex-col items-center gap-2">
					<div className="flex h-10 w-10 items-center justify-center bg-primary">
						<span className="font-sans text-[18px] font-normal text-primary-foreground">
							C
						</span>
					</div>
					<h1 className="font-sans text-[20px] font-normal tracking-[-0.2px] text-foreground">
						Allfix Admin
					</h1>
					<p className="text-[13px] text-muted-foreground">
						Sign in to your admin account
					</p>
				</div>

				<form
					onSubmit={handleSubmit}
					className="border border-border bg-surface p-6"
				>
					<div className="space-y-4">
						<div>
							<label
								htmlFor="email"
								className="mb-1.5 block text-[12px] font-medium text-foreground"
							>
								Email
							</label>
							<input
								id="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="admin@allfix.pk"
								className="h-9 w-full border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="mb-1.5 block text-[12px] font-medium text-foreground"
							>
								Password
							</label>
							<input
								id="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="h-9 w-full border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						</div>

						{error && (
							<p className="bg-danger/10 px-3 py-2 text-[12px] text-danger">
								{error.message || "Invalid email or password."}
							</p>
						)}

						{wrongRole && (
							<p className="bg-danger/10 px-3 py-2 text-[12px] text-danger">
								This account does not have admin access.
							</p>
						)}

						<button
							type="submit"
							disabled={isPending}
							className="h-9 w-full bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
						>
							{isPending ? "Signing in…" : "Sign In"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Login;
