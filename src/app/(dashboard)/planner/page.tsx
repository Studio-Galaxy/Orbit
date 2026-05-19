"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  due_date?: string;
};

export default function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("Auth error:", error.message);
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }
      if (data?.user) {
        setUser(data.user);
        loadTasks(data.user.id);
      } else {
        setIsLoaded(true);
        setIsLoading(false);
      }
    });
  }, []);

  async function loadTasks(userId: string) {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error loading tasks:", error.message);
      // fallback to empty if db error
    } else if (data) {
      setTasks(data);
    }
    setIsLoaded(true);
    setIsLoading(false);
  }

  const toggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    const { error } = await supabase
      .from('planner_tasks')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      console.error("Error updating task:", error.message);
      // revert on error
      setTasks(tasks.map(t => t.id === id ? { ...t, status: currentStatus as any } : t));
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    if (!user) {
      alert("You must be logged in to add a task.");
      return;
    }
    
    const title = newTask;
    setNewTask("");
    
    const { data, error } = await supabase
      .from('planner_tasks')
      .insert({
        user_id: user.id,
        title: title,
        priority: 'medium',
        status: 'todo'
      })
      .select()
      .single();
      
    if (error) {
      console.error("Error adding task:", error.message);
    } else if (data) {
      setTasks([data, ...tasks]);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
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
          {isLoading ? (
            <div className="flex justify-center p-8 mt-4"><Loader2 size={24} className="animate-spin text-neutral-500" /></div>
          ) : (
          <AnimatePresence>
            {tasks.map((task) => {
              const isCompleted = task.status === 'completed';
              return (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isCompleted 
                    ? "bg-neutral-900/20 border-transparent opacity-60" 
                    : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                }`}
                onClick={() => toggleTask(task.id, task.status)}
              >
                <div className="flex items-center gap-4">
                  <button className={`flex-shrink-0 transition-colors ${isCompleted ? "text-white" : "text-neutral-600 group-hover:text-neutral-400"}`}>
                    {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <span className={`text-sm ${isCompleted ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {task.due_date && (
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 bg-neutral-800/50 rounded-md text-neutral-500">
                      <Clock size={10} />
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {!isCompleted && (
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500' :
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  )}
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
