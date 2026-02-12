"use client";

import { useState, useEffect } from "react";
import { FirebaseService, TiffinStats } from "@/lib/firebase";
import { Loader2, UtensilsCrossed, CalendarX, IndianRupee, History, CalendarDays } from "lucide-react";

// Mock User ID for demo - in real app, get from AuthContext
const UID = "demo_user_123"; 

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TiffinStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Quick hack to re-trigger useEffect

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await FirebaseService.getDashboardStats(UID);
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refreshKey]);

  const handleToggleToday = async () => {
    if (!stats) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const newStatus = !stats.isTodaySkipped;
    
    // Optimistic UI Update
    setStats(prev => prev ? ({ 
      ...prev, 
      isTodaySkipped: newStatus,
      // Approximate balance update for immediate feedback
      balance: prev.balance + (newStatus ? -60 : 60)
    }) : null);

    await FirebaseService.toggleSkip(UID, todayStr, newStatus);
    setRefreshKey(k => k + 1); // Refresh strictly to ensure server sync
  };

  const payLink = "upi://pay?pa=sanjaybhatia0781@okicici&pn=Sanjay+Tiffin&cu=INR";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      
      {/* Header */}
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <UtensilsCrossed className="w-6 h-6 text-orange-500" />
          TiffinTracker
        </h1>
        <p className="text-sm text-slate-500">Since Feb 1, 2026</p>
      </header>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto pb-24">
        
        {/* Balance Card */}
        <div className={`rounded-2xl p-6 shadow-sm border ${
          (stats?.balance || 0) > 0 
            ? "bg-red-50 border-red-100 text-red-900" 
            : "bg-green-50 border-green-100 text-green-900"
        }`}>
          <p className="text-sm font-medium opacity-80 uppercase tracking-wide">
            {(stats?.balance || 0) > 0 ? "You Owe" : "Advance Paid"}
          </p>
          <div className="text-5xl font-bold mt-2 flex items-baseline">
            <span className="text-3xl mr-1">₹</span>
            {Math.abs(stats?.balance || 0)}
          </div>
          <div className="mt-4 flex gap-4 text-sm opacity-90">
             <div>
               <span className="block font-semibold">{stats?.totalDays}</span>
               <span className="text-xs">Days</span>
             </div>
             <div className="w-px bg-current opacity-20"></div>
             <div>
               <span className="block font-semibold">{stats?.skippedDays}</span>
               <span className="text-xs">Skipped</span>
             </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleToggleToday}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
              stats?.isTodaySkipped 
                ? "bg-orange-100 border-orange-200 text-orange-800"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            {stats?.isTodaySkipped ? (
              <UtensilsCrossed className="w-6 h-6" />
            ) : (
              <CalendarX className="w-6 h-6" />
            )}
            <span className="font-medium text-sm">
              {stats?.isTodaySkipped ? "I Ate Today" : "Skip Today"}
            </span>
          </button>

          <a 
            href={payLink}
            className="p-4 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            <IndianRupee className="w-6 h-6" />
            <span className="font-medium text-sm">Pay Now</span>
          </a>
        </div>

        {/* Recent Activity / Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Breakdown</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Bill Generated</span>
              <span className="font-medium">₹{stats?.totalCost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Paid</span>
              <span className="font-medium text-green-600">- ₹{stats?.totalPaid}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-slate-800">
              <span>Net Payable</span>
              <span>₹{stats?.balance}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-20">
        <button className="flex flex-col items-center gap-1 text-blue-600">
          <CalendarDays className="w-6 h-6" />
          <span className="text-[10px] font-medium">Dash</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <History className="w-6 h-6" />
          <span className="text-[10px] font-medium">History</span>
        </button>
      </nav>
    </div>
  );
}