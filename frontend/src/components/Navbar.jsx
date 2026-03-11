function Navbar({ onLogout }) {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <h1 className="text-lg font-bold">CRM</h1>

      <button
        onClick={onLogout}
        className="bg-red-500 px-3 py-1 rounded"
      >
        Logout
      </button>
    </nav>
  );
}

export default Navbar;