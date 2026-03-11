import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="flex">

      <Sidebar />

      <div className="flex-1">
        <Navbar onLogout={handleLogout} />

        <div className="p-6">
          <h2 className="text-2xl">Dashboard</h2>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;