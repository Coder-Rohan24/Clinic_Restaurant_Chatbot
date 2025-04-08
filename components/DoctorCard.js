import { useState } from "react";
import CheckoutPopup from "./CheckoutPopup";

export default function DoctorCard({ doctor }) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 transition-transform hover:scale-[1.02] animate-fade-in">
      <h3 className="text-2xl font-semibold text-gray-800">{doctor.name}</h3>
      <p className="text-blue-600 font-medium mb-1">{doctor.specialization}</p>
      <p className="text-yellow-500 font-semibold">⭐ {doctor.rating}</p>
      <p className="mt-2 text-gray-700 font-bold text-lg">₹{doctor.consultation_fee}</p>
      <button
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        onClick={() => setShowPopup(true)}
      >
        Book Appointment
      </button>

      {showPopup && <CheckoutPopup doctor={doctor} closePopup={() => setShowPopup(false)} />}
    </div>
  );
}
