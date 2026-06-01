import { Link } from "react-router-dom";
import { Button } from "@/components/cb/Form";

const NotFound = () => (
	<div className="flex min-h-screen items-center justify-center bg-background px-6">
		<div className="text-center">
			<div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
				404
			</div>
			<h1 className="mt-2 text-[20px] font-normal tracking-[-0.2px]">
				Page not found
			</h1>
			<p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
				The page you're looking for doesn't exist or has been moved.
			</p>
			<div className="mt-6">
				<Link to="/">
					<Button>Back to dashboard</Button>
				</Link>
			</div>
		</div>
	</div>
);

export default NotFound;
