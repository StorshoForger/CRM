import { useEffect, useState } from "react";
import axios from "axios";

function Leads() {

  const [leads, setLeads] = useState([]);

  useEffect(() => {

    const fetchLeads = async () => {

      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(
          "http://localhost:5000/leads",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setLeads(response.data);

      } catch (error) {
        console.error("Error fetching leads:", error);
      }

    };

    fetchLeads();

  }, []);

  return (
    <div className="p-6">

      <h2 className="text-2xl mb-4">Leads</h2>

      {leads.length === 0 ? (
        <p>No leads found</p>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id} className="p-3 bg-gray-800 text-white rounded">
              <p><strong>{lead.name}</strong></p>
              <p>{lead.email}</p>
              <p>{lead.phone}</p>
              <p>Status: {lead.status}</p>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

export default Leads;