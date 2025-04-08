export default function DishCard({ dish, addToCart }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-lg hover:shadow-2xl border border-gray-200 transition duration-300 transform hover:-translate-y-1 animate-fade-in">
      <h3 className="text-xl font-semibold text-gray-800">{dish.dish_name}</h3>
      <p className="text-gray-600 mt-1">{dish.description}</p>
      <p className="text-blue-600 font-bold mt-3 text-lg">₹{dish.Price}</p>
      <button
        className="mt-4 bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600 transition"
        onClick={() => addToCart(dish)}
      >
        Add to Cart
      </button>
    </div>
  );
}
