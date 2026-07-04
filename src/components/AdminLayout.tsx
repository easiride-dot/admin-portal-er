import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const AdminLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-secondary/10 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
