import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black bg-opacity-30 backdrop-blur-md shadow-sm text-white px-8 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-extrabold tracking-wide">
        <Link href="/">GenAI <span className="text-purple-300">Services</span></Link>
      </h1>
      <div className="space-x-6 text-lg font-medium">
        <Link href="/">
          <span className="hover:text-purple-200 transition cursor-pointer">Home</span>
        </Link>
        <Link href="/restaurant">
          <span className="hover:text-purple-200 transition cursor-pointer">Restaurant</span>
        </Link>
        <Link href="/clinic">
          <span className="hover:text-purple-200 transition cursor-pointer">Clinic</span>
        </Link>
      </div>
    </nav>
  );
}
