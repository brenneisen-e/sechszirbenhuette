'use client';

import {
  ListTodo, RefreshCw, Loader2, CheckCircle2,
  UserCircle, Check, ExternalLink
} from 'lucide-react';
import type { Task, Guest } from './types';

interface AllTasksViewProps {
  allTasks: Task[];
  guests: Guest[];
  loadingAllTasks: boolean;
  onLoadAllTasks: () => void;
  onToggleTaskStatus: (taskId: number, isCompleted: boolean) => void;
  onNavigateToGuest: (guest: Guest) => void;
  getLatestBooking: (guest: Guest) => { arrival: string | null; departure: string | null };
}

export function AllTasksView({
  allTasks,
  guests,
  loadingAllTasks,
  onLoadAllTasks,
  onToggleTaskStatus,
  onNavigateToGuest,
  getLatestBooking,
}: AllTasksViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ListTodo className="w-5 h-5" />
          Offene Aufgaben
        </h3>
        <button
          onClick={onLoadAllTasks}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loadingAllTasks ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {loadingAllTasks ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : allTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="text-lg font-medium">Keine offenen Aufgaben</p>
          <p className="text-sm">Alle Aufgaben wurden erledigt!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {/* Group tasks by guest */}
          {(() => {
            const tasksByGuest = allTasks.reduce((acc, task) => {
              if (!acc[task.guest_id]) {
                acc[task.guest_id] = [];
              }
              acc[task.guest_id].push(task);
              return acc;
            }, {} as Record<number, Task[]>);

            return Object.entries(tasksByGuest).map(([guestIdStr, tasks]) => {
              const guestId = parseInt(guestIdStr);
              const guest = guests.find(g => g.id === guestId);
              if (!guest) return null;

              return (
                <div key={guestId} className="p-4 hover:bg-gray-50">
                  {/* Guest Header */}
                  <div
                    className="flex items-center justify-between mb-3 cursor-pointer"
                    onClick={() => onNavigateToGuest(guest)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 hover:text-primary">
                          {guest.guest_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(() => {
                            const latestBooking = getLatestBooking(guest);
                            return latestBooking.arrival && latestBooking.departure
                              ? `${new Date(latestBooking.arrival).toLocaleDateString('de-DE')} - ${new Date(latestBooking.departure).toLocaleDateString('de-DE')}`
                              : 'Keine Buchungsdaten';
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        {tasks.filter(t => t.is_completed === 0).length} offen
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="ml-13 space-y-2">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          task.is_completed ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-200'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaskStatus(task.id, !task.is_completed);
                          }}
                          className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                            task.is_completed
                              ? 'bg-green-500 text-white'
                              : 'border-2 border-gray-300 hover:border-primary'
                          }`}
                        >
                          {task.is_completed ? <Check className="w-3 h-3" /> : null}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {task.title}
                          </p>
                          {task.due_date && (
                            <p className="text-xs text-gray-400">
                              Fällig: {new Date(task.due_date).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </div>
                        {task.assigned_to && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {task.assigned_to}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
