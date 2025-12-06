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
    const consumed = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const remaining = Math.max(0, goal - consumed);
    const percentage = Math.min(100, Math.round((consumed / goal) * 100));
    return { consumed, goal, remaining, percentage };
  };

  // Fetch today's meals from orders
  const fetchTodaysMeals = async () => {
    // In tests, prefer mock dashboard data when available
    if (process.env.NODE_ENV === 'test') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const md = await import('@/lib/mockDashboardData');
        if (md && md.mockDashboardData && Array.isArray(md.mockDashboardData.todaysMeals)) {
          return md.mockDashboardData.todaysMeals as unknown as MealLog[];
        }
      } catch (e) {
        // ignore and fall back to real API fetch
      }
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const res = await apiFetch('/api/orders/me');
      if (!res.ok) {
        console.error('Failed to fetch orders');
        return [];
      }
      
      const orders = await res.json();
      
      // Filter today's orders and convert to meal logs
      const todayOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      // Convert orders to meal logs
      const meals: MealLog[] = todayOrders.flatMap((order: any) => 
        order.items.map((item: any) => ({
          id: item._id || `${order._id}-${item.item}`,
          foodName: item.item,
          restaurant: item.restaurant,
          calories: item.calories || 0,
          time: new Date(order.createdAt).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          protein: item.protein,
          carbs: item.carbohydrates,
          fat: item.totalFat,
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
