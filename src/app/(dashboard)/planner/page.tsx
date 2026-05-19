"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock, CheckCircle2, Circle, Loader2, Trash2, Calendar, X, Flag } from "lucide-react";
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
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const dateInputRef = useRef<HTMLInputElement>(null);
  
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
    const dateToSave = dueDate || null;
    const priorityToSave = priority;
    
    setNewTask("");
    setDueDate("");
    setPriority("medium");
    
    const { data, error } = await supabase
      .from('planner_tasks')
      .insert({
        user_id: user.id,
        title: title,
        priority: priorityToSave,
        status: 'todo',
        due_date: dateToSave
      })
      .select()
      .single();
      
    if (error) {
      console.error("Error adding task:", error.message);
    } else if (data) {
      setTasks([data, ...tasks]);
    }
  };

  const deleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const previousTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));
    
    const { error } = await supabase.from('planner_tasks').delete().eq('id', id);
    if (error) {
      console.error("Error deleting task:", error.message);
      setTasks(previousTasks);
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
        <form onSubmit={handleAddTask} className="w-full bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden focus-within:border-neutral-600 transition-colors shadow-sm mb-4">
          <input 
            type="text" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-white text-base py-5 px-6 placeholder-neutral-500"
            placeholder="What needs to be done?"
          />
          
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/60 border-t border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  ref={dateInputRef}
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                  onClick={(e) => {
                    // Fallback to showPicker if the click doesn't trigger the native UI
                    try {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.preventDefault();
                        dateInputRef.current?.showPicker();
                      }
                    } catch (err) {}
                  }}
                />
                
                {dueDate ? (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 relative z-0">
                    <Clock size={12} />
                    {new Date(dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium px-3 py-2 rounded-lg border border-transparent hover:bg-neutral-800 transition-colors relative z-0">
                    <Calendar size={14} />
                    Set Date & Time
                  </div>
                )}
              </div>
              
              {dueDate && (
                 <button type="button" onClick={() => setDueDate("")} className="p-2 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors relative z-20 tooltip" title="Clear Date">
                   <X size={14} />
                 </button>
              )}
              
              <button 
                type="button" 
                onClick={() => setPriority(priority === 'low' ? 'medium' : priority === 'medium' ? 'high' : 'low')} 
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  priority === 'high' ? "text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20" :
                  priority === 'medium' ? "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" :
                  "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                }`}
              >
                <Flag size={12} className={priority === 'high' ? 'fill-red-400/50' : priority === 'medium' ? 'fill-amber-400/50' : 'fill-blue-400/50'} />
                {priority === 'high' ? 'Important' : priority === 'medium' ? 'Medium' : 'Low'}
              </button>
            </div>
            
            <button 
              type="submit" 
              disabled={!newTask.trim()}
              className="bg-white text-black font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>
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
                      {new Date(task.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}
                  {!isCompleted && (
                    <div className={`w-2 h-2 rounded-full hidden sm:block ${
                      task.priority === 'high' ? 'bg-red-500' :
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  )}
                  <button 
                    onClick={(e) => deleteTask(task.id, e)}
                    className="ml-2 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 size={16} />
                  </button>
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
