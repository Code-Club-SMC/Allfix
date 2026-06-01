// Legacy index — actual routing handled in App.tsx via role-based redirect.
import { Navigate } from "react-router-dom";

const Index = () => <Navigate to="/admin" replace />;
export default Index;
