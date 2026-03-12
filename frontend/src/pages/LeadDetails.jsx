import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

function LeadDetails() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");

  const fetchLead = async () => {
    try {

      const response = await api.get(`/leads/${id}`);

      setLead(response.data);

    } catch (error) {
      console.error("Error fetching lead:", error);
    }
  };

  const fetchNotes = async () => {
    try {

      const response = await api.get(`/leads/${id}/notes`);

      setNotes(response.data);

    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const addNote = async () => {

    if (!noteText.trim()) return;

    try {

      await api.post(`/leads/${id}/notes`, {
        note_text: noteText
      });

      setNoteText("");

      fetchNotes();

    } catch (error) {
      console.error("Error adding note:", error);
    }

  };

  const updateStatus = async (newStatus) => {

    try {

      await api.put(`/leads/${id}`, {
        status: newStatus
      });

      fetchLead();

    } catch (error) {
      console.error("Error updating status:", error);
    }

  };

  const deleteLead = async () => {

    const confirmDelete = window.confirm("Are you sure you want to delete this lead?");

    if (!confirmDelete) return;

    try {

      await api.delete(`/leads/${id}`);

      navigate("/leads");

    } catch (error) {
      console.error("Error deleting lead:", error);
    }

  };

  useEffect(() => {
    fetchLead();
    fetchNotes();
  }, [id]);

  if (!lead) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="p-6 text-white">

      <h2 className="text-2xl mb-4">Lead Details</h2>

      <div className="bg-gray-800 p-4 rounded space-y-3">

        <p>
          <strong>Name:</strong> {lead.name}
        </p>

        <p>
          <strong>Email:</strong> {lead.email || "Not provided"}
        </p>

        <p>
          <strong>Phone:</strong> {lead.phone || "Not provided"}
        </p>

        <div>
          <strong>Status:</strong>

          <select
            value={lead.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="ml-2 bg-gray-700 p-1 rounded"
          >
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="won">won</option>
            <option value="lost">lost</option>
          </select>

        </div>

      </div>

      <button
        onClick={deleteLead}
        className="mt-4 bg-red-600 px-4 py-2 rounded text-white"
      >
        Delete Lead
      </button>

      {/* NOTES SECTION */}

      <div className="mt-6">

        <h3 className="text-xl mb-3">Notes</h3>

        {notes.length === 0 ? (
          <p>No notes yet</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="bg-gray-800 p-2 rounded">
                {note.note_text}
              </li>
            ))}
          </ul>
        )}

      </div>

      {/* ADD NOTE */}

      <div className="mt-4 flex gap-2">

        <input
          type="text"
          placeholder="Write a note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="p-2 bg-gray-800 rounded text-white flex-1"
        />

        <button
          onClick={addNote}
          className="bg-blue-600 px-4 py-2 rounded text-white"
        >
          Add
        </button>

      </div>

    </div>
  );
}

export default LeadDetails;