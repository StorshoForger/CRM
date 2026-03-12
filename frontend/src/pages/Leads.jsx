import { useEffect, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

function Leads() {

  const [leads, setLeads] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const fetchLeads = async () => {

    try {

      const response = await api.get("/leads");

      setLeads(response.data);

    } catch (error) {
      console.error("Error fetching leads:", error);
    }

  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const createLead = async (e) => {

    e.preventDefault();

    try {

      await api.post("/leads", {
        name,
        email,
        phone
      });

      setName("");
      setEmail("");
      setPhone("");

      fetchLeads();

    } catch (error) {

      if (error.response && error.response.data.error) {
        alert(error.response.data.error);
      } else {
        console.error("Error creating lead:", error);
      }

    }

  };

  return (
    <div className="p-6">

      <h2 className="text-2xl mb-4">Leads</h2>

      <form onSubmit={createLead} className="mb-6 space-y-3">

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white w-full"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white w-full"
        />

        <input
          type="text"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white w-full"
        />

        <button
          type="submit"
          className="bg-blue-600 px-4 py-2 rounded text-white"
        >
          Create Lead
        </button>

      </form>

      {leads.length === 0 ? (
        <p>No leads found</p>
      ) : (
        <ul className="space-y-3">

          {leads.map((lead) => (
            <li key={lead.id} className="p-3 bg-gray-800 text-white rounded">

              <Link to={`/leads/${lead.id}`}>

                <p><strong>{lead.name}</strong></p>
                <p>{lead.email}</p>
                <p>{lead.phone}</p>
                <p>Status: {lead.status}</p>

              </Link>

            </li>
          ))}

        </ul>
      )}

    </div>
  );

}

export default Leads;