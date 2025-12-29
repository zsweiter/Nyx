import { Outlet } from "react-router-dom";

export const AuthLayout = () => {
    return (
        <div className="flex h-screen bg-gray-900 text-white auth-layout">
            <Outlet />
        </div>
    );
};
