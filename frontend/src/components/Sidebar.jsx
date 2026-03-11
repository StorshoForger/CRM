import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="bg-gray-800 text-white w-48 min-h-screen p-4">

      <ul className="space-y-4">
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>

        <li>
          <Link to="/leads">Leads</Link>
        </li>
      </ul>

    </div>
  );
}

export default Sidebar;