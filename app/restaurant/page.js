"use client";
import { useState } from "react";
import menuData from "../../data/restaurant_menu.json";
import Chatbot from "../../components/Chatbot";
import DishCard from "../../components/DishCard";

export default function RestaurantPage() {
  const [cart, setCart] = useState([]);

  const addToCart = (dish) => {
    setCart([...cart, dish]);
  };

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-orange-100 px-6 pb-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section: Dish Listing */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Explore the Menu</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuData.map((dish, index) => (
              <DishCard key={index} dish={dish} addToCart={addToCart} />
            ))}
          </div>
        </div>

        {/* Right Section: Chatbot */}
        <div className="sticky top-24 h-fit">
          <Chatbot apiEndpoint="/api/chat_restaurant" />
        </div>
      </div>
    </div>
  );
}
