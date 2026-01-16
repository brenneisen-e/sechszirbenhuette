'use client';

import { useState } from 'react';
import { ListTodo, Check, X, Circle, Plus, Loader2, Trash2, Edit3 } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import type { Task } from '../types';

interface GuestTasksTabProps {
  tasks: Task[];
  loading: boolean;
  onCreateTask: (title: string, assignee?: string, dueDate?: string) => Promise<void>;
  onUpdateTask: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onCycleStatus: (taskId: number, currentStatus: number) => void;
}

const STATUS_CONFIG = {
  0: { label: 'Offen', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
  1: { label: 'Erledigt', icon: Check, color: 'text-green-600', bg: 'bg-green-100' },
  2: { label: 'N/A', icon: X, color: 'text-gray-400', bg: 'bg-gray-50' },
};

export function GuestTasksTab({
  tasks,
  loading,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCycleStatus,
}: GuestTasksTabProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskAssignee, setEditTaskAssignee] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      await onCreateTask(newTaskTitle, newTaskAssignee, newTaskDueDate);
      setNewTaskTitle('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
    } finally {
      setSavingTask(false);
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskAssignee(task.assigned_to ?? '');
    setEditTaskDueDate(task.due_date ?? '');
  };

  const handleSaveEdit = async (taskId: number) => {
    await onUpdateTask(taskId, {
      assigned_to: editTaskAssignee || undefined,
      due_date: editTaskDueDate || undefined,
    });
    setEditingTaskId(null);
  };

  // Group tasks by status
  const pendingTasks = tasks.filter((t) => t.is_completed === 0);
  const completedTasks = tasks.filter((t) => t.is_completed === 1);
  const naTasks = tasks.filter((t) => t.is_completed === 2);

  const renderTask = (task: Task) => {
    const status = STATUS_CONFIG[task.is_completed as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG[0];
    const StatusIcon = status.icon;
    const isEditing = editingTaskId === task.id;

    return (
      <div
        key={task.id}
        className={`p-3 rounded-lg border transition-colors group ${
          task.is_completed === 2 ? 'opacity-50' : ''
        } ${status.bg}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => onCycleStatus(task.id, task.is_completed)}
            className={`mt-0.5 p-1 rounded-full hover:bg-white/50 transition-colors ${status.color}`}
            title={`Status: ${status.label} - Klicken zum Ändern`}
          >
            <StatusIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <p className={`font-medium ${task.is_completed === 1 ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {task.title}
            </p>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  placeholder="Zuständig"
                  value={editTaskAssignee}
                  onChange={(e) => setEditTaskAssignee(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(task.id)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setEditingTaskId(null)}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                {task.assigned_to && <span>Zuständig: {task.assigned_to}</span>}
                {task.due_date && <span>Fällig: {formatDate(task.due_date)}</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing && (
              <>
                <button
                  onClick={() => handleStartEdit(task)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
        <ListTodo className="w-4 h-4" />
        Aufgaben ({tasks.length})
      </h4>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Offen ({pendingTasks.length})</h5>
              <div className="space-y-2">{pendingTasks.map(renderTask)}</div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Erledigt ({completedTasks.length})</h5>
              <div className="space-y-2">{completedTasks.map(renderTask)}</div>
            </div>
          )}

          {/* N/A Tasks */}
          {naTasks.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-400 mb-2">N/A ({naTasks.length})</h5>
              <div className="space-y-2">{naTasks.map(renderTask)}</div>
            </div>
          )}

          {tasks.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">Keine Aufgaben</p>
          )}

          {/* Add Task Form */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Neue Aufgabe..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim() || savingTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
