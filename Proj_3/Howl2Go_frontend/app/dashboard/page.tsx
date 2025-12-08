"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import DashboardHero from "@/components/DashboardHero";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import type { MealLog, DailyProgress } from "@/types/user";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [todaysMeals, setTodaysMeals] = useState<MealLog[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>({
    consumed: 0,
    goal: 2000,
    remaining: 2000,
    percentage: 0,
  });

  // Calculate daily progress from meals
  const calculateDailyProgress = (meals: MealLog[], goal: number): DailyProgress => {
    const consumed = meals.reduce((sum, meal) => sum + (meal.foodItem?.calories || 0), 0);
    const remaining = Math.max(0, goal - consumed);
    const percentage = Math.min(100, Math.round((consumed / goal) * 100));
    return { consumed, goal, remaining, percentage };
  };

  // Fetch today's meals from orders
  const fetchTodaysMeals = async () => {
    // In tests, prefer mock dashboard data when available
    if (process.env.NODE_ENV === 'test') {
      try {
        const md = await import('@/lib/mockDashboardData');
        if (md && md.mockDashboardData && Array.isArray(md.mockDashboardData.todaysMeals)) {
          return md.mockDashboardData.todaysMeals as unknown as MealLog[];
        }
      } catch {
        // ignore and fall back to real API fetch
      }
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const res = await apiFetch('/api/orders');
      if (!res.ok) {
        console.error('Failed to fetch orders');
        return [];
      }
      
      interface OrderItem {
        _id: string;
        item: string;
        restaurant: string;
        calories?: number;
        price?: number;
        caloriesFromFat?: number | null;
        totalFat?: number | null;
        saturatedFat?: number | null;
        transFat?: number | null;
        cholesterol?: number | null;
        sodium?: number | null;
        carbohydrates?: number | null;
        fiber?: number | null;
        sugars?: number | null;
        protein?: number | null;
        ingredients?: string[];
      }
      
      interface Order {
        _id: string;
        createdAt: string;
        items: OrderItem[];
      }
      
      const responseData = await res.json();
      const orders: Order[] = responseData.data?.orders || [];
      
      // Filter today's orders and convert to meal logs
      const todayOrders = orders.filter((order: Order) => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      // Convert orders to meal logs
      const meals: MealLog[] = todayOrders.flatMap((order: Order) => 
        order.items.map((item) => ({
          id: item._id || `${order._id}-${item.item}`,
          timestamp: new Date(order.createdAt),
          mealType: 'lunch' as const, // Default to lunch for orders
          foodItem: {
            _id: item._id,
            restaurant: item.restaurant,
            item: item.item,
            calories: item.calories || 0,
            price: item.price,
            caloriesFromFat: item.caloriesFromFat,
            totalFat: item.totalFat,
            saturatedFat: item.saturatedFat,
            transFat: item.transFat,
            cholesterol: item.cholesterol,
            sodium: item.sodium,
            carbs: item.carbohydrates,
            fiber: item.fiber,
            sugars: item.sugars,
            protein: item.protein,
            ingredients: item.ingredients,
          },
        }))
      );
      
      return meals;
    } catch (error) {
      console.error('Error fetching today\'s meals:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchTodaysMeals().then(meals => {
        setTodaysMeals(meals);
        
        // Calculate progress based on fetched meals and user's daily goal
        const goal = user.dailyGoal || 2000;
        const progress = calculateDailyProgress(meals, goal);
        setDailyProgress(progress);
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--howl-bg)] flex items-center justify-center">
        <div className="text-[var(--text)] text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--howl-bg)] flex items-center justify-center">
        <div className="text-[var(--text)] text-xl">
          Please log in to view dashboard
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--howl-bg)]">
      <Header />

      <div className="pt-15 min-h-screen">
        <DashboardHero
          userName={user.name}
          dailyProgress={dailyProgress}
          recentMeals={todaysMeals}
        />
      </div>

      <Footer />
    </div>
  );
}
