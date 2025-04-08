"use client";
import clinicData from "../../data/clinic_appointments.json";
import Chatbot from "../../components/Chatbot";
import DoctorCard from "../../components/DoctorCard";

export default function ClinicPage() {
  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-white via-blue-50 to-purple-100 px-6 pb-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Book an Appointment</h1>
          <div className="space-y-6">
            {clinicData.map((doctor, index) => (
              <DoctorCard key={index} doctor={doctor} />
            ))}
          </div>
        </div>

        {/* Right Section */}
        <div className="sticky top-24 h-fit">
          <Chatbot apiEndpoint="/api/chat_clinic" />
        </div>
      </div>
    </div>
  );
}
