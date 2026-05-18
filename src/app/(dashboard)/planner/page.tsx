"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock, CheckCircle2, Circle } from "lucide-react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  due?: string;
};

export default function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Review Calculus Chapter 4 Exercises", completed: false, priority: "high", due: "Today" },
    { id: "2", title: "Read Machine Learning PDF - Section 2", completed: true, priority: "medium" },
    { id: "3", title: "Draft Physics Lab Report", completed: false, priority: "medium", due: "Tomorrow" },
    { id: "4", title: "Quiz preparation for Quantum Mechanics", completed: false, priority: "low" },
  ]);

  const [newTask, setNewTask] = useState("");

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([{ id: Date.now().toString(), title: newTask, completed: false, priority: "medium" }, ...tasks]);
    setNewTask("");
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 lg:p-12 min-h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Study Planner
          </h1>
          <p className="text-neutral-400">
            Keep track of your study objectives and assignments.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-800"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-white transition-all duration-500 ease-out"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-white">{progress}%</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Daily Progress</div>
            <div className="text-xs text-neutral-500">{completedCount} of {tasks.length} tasks completed</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Input */}
        <form onSubmit={handleAddTask} className="relative w-full">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Plus size={18} className="text-neutral-500" />
          </div>
          <input 
            type="text" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-neutral-700 outline-none text-white text-sm py-4 pl-12 pr-4 rounded-2xl transition-all shadow-sm"
            placeholder="Add a new task... (press Enter)"
          />
        </form>

        {/* Task List */}
        <div className="space-y-2">
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  task.completed 
                    ? "bg-neutral-900/20 border-transparent opacity-60" 
                    : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                }`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="flex items-center gap-4">
                  <button className={`flex-shrink-0 transition-colors ${task.completed ? "text-white" : "text-neutral-600 group-hover:text-neutral-400"}`}>
                    {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <span className={`text-sm ${task.completed ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {task.due && (
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 bg-neutral-800/50 rounded-md text-neutral-500">
                      <Clock size={10} />
                      {task.due}
                    </div>
                  )}
                  {!task.completed && (
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500' :
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
