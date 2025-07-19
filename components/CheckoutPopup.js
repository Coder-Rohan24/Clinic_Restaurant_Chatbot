import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function CheckoutPopup({ doctor, closePopup }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const popup = (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-10 flex justify-center items-center animate-fade-in">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold">Confirm Appointment</h2>
        <p className="mt-2 text-gray-600">Doctor: {doctor.name}</p>
        <p className="text-gray-600">Specialization: {doctor.specialization}</p>
        <p className="text-gray-600">Fee: ₹{doctor.consultation_fee}</p>
        <div className="flex justify-between mt-4">
          <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={closePopup}>
            Cancel
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(popup, document.body) : null;
}
