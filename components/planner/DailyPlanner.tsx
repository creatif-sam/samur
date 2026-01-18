'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle2, Plus, ChevronLeft, ChevronRight, Sparkles, Moon, Sun, Target } from 'lucide-react';
import React from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  display: `${String(i).padStart(2, '0')}:00`,
  period: i < 12 ? 'AM' : 'PM',
  displayShort: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
}));

export default function DailyPlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [reflection, setReflection] = useState('');
  const [showMorningPrompt, setShowMorningPrompt] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getTimeProgress = () => {
    const minutes = currentTime.getMinutes();
    return (currentHour * 60 + minutes) / (24 * 60) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Daily Planner
                </h1>
                <p className="text-gray-500 text-sm mt-1">Design your perfect day</p>
              </div>
            </div>
            
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Assist
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
            <button 
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-white rounded-xl transition-all duration-200 hover:shadow-md"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{formatDate(selectedDate)}</p>
              {isToday && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">Today</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-white rounded-xl transition-all duration-200 hover:shadow-md"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Progress Bar */}
          {isToday && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Day Progress</span>
                <span className="text-sm font-bold text-indigo-600">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                  style={{ width: `${getTimeProgress()}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Morning Intentions */}
        {showMorningPrompt && (
          <div className="mb-6 backdrop-blur-xl bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-3xl shadow-xl border border-orange-200/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-300 rounded-full filter blur-3xl opacity-20"></div>
            <div className="relative flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Morning Intentions</h3>
                <textarea
                  placeholder="What are your top 3 priorities today? What would make today great?"
                  className="w-full bg-white/70 backdrop-blur-sm border-2 border-orange-200 rounded-xl p-4 focus:outline-none focus:border-orange-400 transition-colors resize-none"
                  rows={3}
                />
              </div>
              <button 
                onClick={() => setShowMorningPrompt(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main Schedule Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-600" />
                Timeline
              </h2>
              <button className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Quick Add
              </button>
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-gray-100">
              {HOURS.map(({ hour, display, displayShort }) => {
                const isCurrentHour = isToday && hour === currentHour;
                const isPastHour = isToday && hour < currentHour;
                
                return (
                  <div 
                    key={hour}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                      isCurrentHour 
                        ? 'bg-gradient-to-r from-indigo-100 to-blue-100 shadow-md scale-[1.02]' 
                        : isPastHour
                        ? 'opacity-50 hover:opacity-75'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`min-w-[80px] text-right ${isCurrentHour ? 'font-bold text-indigo-600' : 'text-gray-500'}`}>
                      <div className="text-lg">{displayShort}</div>
                      {isCurrentHour && (
                        <div className="text-xs text-indigo-500 mt-1 flex items-center justify-end gap-1">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                          Now
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className={`h-px ${isCurrentHour ? 'bg-indigo-300' : 'bg-gray-200'} mb-2`}></div>
                      <div className="min-h-[40px] flex items-center gap-2 cursor-pointer group">
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-gray-400 group-hover:text-indigo-600 transition-colors">
                          Add task...
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Today's Focus
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Completed</span>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">0</div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Pending</span>
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600">0</div>
                </div>
              </div>
            </div>

            {/* Evening Reflection */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-3xl shadow-xl border border-indigo-200/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl shadow-lg">
                  <Moon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Evening Reflection</h3>
              </div>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What went well today? What could be improved?"
                className="w-full bg-white/70 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-4 focus:outline-none focus:border-indigo-400 transition-colors resize-none"
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thumb-indigo-300::-webkit-scrollbar-thumb {
          background-color: #a5b4fc;
          border-radius: 3px;
        }
        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background-color: #f3f4f6;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}