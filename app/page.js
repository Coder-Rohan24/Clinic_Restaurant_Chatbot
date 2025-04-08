import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex flex-col items-center justify-center px-4 py-10 text-white">
      {/* Banner */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold drop-shadow-lg mb-4">
          Welcome to <span className="bg-white text-purple-600 px-4 py-1 rounded-lg shadow-md">GenAI Services</span>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto font-light">
          Powering smarter decisions in food & health with intelligent services.
        </p>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        <Link href="/restaurant">
          <div className="group p-6 md:p-8 bg-white text-gray-900 rounded-3xl shadow-xl cursor-pointer transform hover:scale-105 transition duration-300 ease-in-out">
            <h2 className="text-3xl font-semibold mb-2 group-hover:text-purple-600 transition-colors">Restaurant</h2>
            <p className="text-md">
              Explore our delicious AI-curated menu and order your favorite dishes with ease.
            </p>
          </div>
        </Link>

        <Link href="/clinic">
          <div className="group p-6 md:p-8 bg-white text-gray-900 rounded-3xl shadow-xl cursor-pointer transform hover:scale-105 transition duration-300 ease-in-out">
            <h2 className="text-3xl font-semibold mb-2 group-hover:text-red-500 transition-colors">Clinic</h2>
            <p className="text-md">
              Book appointments, access prescriptions, and consult top-rated doctors in just a few clicks.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
