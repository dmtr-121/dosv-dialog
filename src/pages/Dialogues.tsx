import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import DialogueListItem from '../components/dialogue/DialogueListItem';
import { ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { courses } from '../data/dialogueCategories';
import { useDialogues } from '../hooks/useDialogues';
import { useDialogueContext } from '../context/dialogue';

// Simple colors for visual differentiation
const colors = ['#4338ca', '#6366f1', '#7c3aed', '#6d28d9', '#9333ea', '#4f46e5', '#8b5cf6'];

export default function Dialogues() {
  const { courseId, moduleId, categoryId } = useParams();
  const [selectedCourse, setSelectedCourse] = useState(courseId || null);
  const [selectedModule, setSelectedModule] = useState(moduleId || null);
  const navigate = useNavigate();
  const { state } = useDialogueContext();
  const location = useLocation();
  
  // Update state when params change
  useEffect(() => {
    if (courseId) setSelectedCourse(courseId);
    if (moduleId) setSelectedModule(moduleId);
    if (categoryId && !courseId && !moduleId) {
      setSelectedCourse(categoryId);
      setSelectedModule(null);
    }
  }, [courseId, moduleId, categoryId]);
  
  const { dialogues, loading } = useDialogues(
    selectedCourse || '',
    selectedModule || '',
    selectedModule 
      ? courses.find(c => c.id === selectedCourse)?.modules.find(m => m.id === selectedModule)?.dialogues || []
      : []
  );

  const handleGoBack = () => {
    if (selectedModule) {
      navigate(`/dialogues/course/${selectedCourse}`);
      setSelectedModule(null);
    } else if (selectedCourse) {
      navigate('/dialogues');
      setSelectedCourse(null);
    } else {
      navigate('/');
    }
  };

  const getPageTitle = () => {
    if (selectedModule && selectedCourse) {
      const module = courses.find(c => c.id === selectedCourse)?.modules.find(m => m.id === selectedModule);
      return module?.name || 'Dialogues';
    } else if (selectedCourse) {
      const course = courses.find(c => c.id === selectedCourse);
      return course?.name || 'Courses';
    }
    return 'Medical Courses';
  };

  const currentCourse = courses.find(c => c.id === selectedCourse);
  const currentModule = currentCourse?.modules.find(m => m.id === selectedModule);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={handleGoBack} className="p-2" aria-label="Go back">
              <ArrowLeft className="w-5 h-5 text-indigo-700" />
            </button>
            <h1 className="text-lg font-medium text-gray-900">{getPageTitle()}</h1>
          </div>
        </div>
      </div>

      {location.state?.completionMessage && (
        <div className="fixed top-14 left-0 right-0 bg-emerald-50 border-b z-5">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <p className="text-emerald-600 text-center">{location.state.completionMessage}</p>
          </div>
        </div>
      )}

      <div className="pt-16 px-4 pb-6 max-w-3xl mx-auto">
        {/* Courses List */}
        {!selectedCourse && (
          <div className="space-y-2">
            {courses.map((course, index) => (
              <Card 
                key={course.id}
                color={colors[index % colors.length]}
                title={course.name}
                description={course.description}
                meta={`${course.modules.length} modules`}
                onClick={() => {
                  navigate(`/dialogues/course/${course.id}`);
                  setSelectedCourse(course.id);
                }}
              />
            ))}
          </div>
        )}

        {/* Modules List */}
        {selectedCourse && !selectedModule && currentCourse && (
          <div className="space-y-2">
            {currentCourse.modules.map((module, index) => (
              <Card 
                key={module.id}
                color={colors[index % colors.length]}
                title={module.name}
                description={module.description}
                meta={`${module.dialogues.length} dialogues`}
                onClick={() => {
                  navigate(`/dialogues/course/${selectedCourse}/module/${module.id}`);
                  setSelectedModule(module.id);
                }}
                compact
              />
            ))}
          </div>
        )}

        {/* Dialogues List */}
        {selectedCourse && selectedModule && currentModule && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-700" />
              </div>
            ) : (
              currentModule.dialogues.map(dialogueId => {
                const dialogue = dialogues[dialogueId];
                return (
                  <DialogueListItem
                    key={dialogueId}
                    id={dialogueId}
                    title={dialogue?.title || 'Loading...'}
                    onClick={() => navigate(`/dialogue-start/${selectedCourse}/${selectedModule}/${dialogueId}`)}
                    isCompleted={state.completedDialogues.has(dialogueId)}
                    categoryId={`${selectedCourse}/${selectedModule}`}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Minimalist card component
function Card({ color, title, description, meta, onClick, compact = false }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border rounded-lg shadow-sm hover:shadow focus:outline-none"
    >
      <div className={`flex items-center p-3 ${compact ? 'py-2' : 'py-3'}`}>
        <div 
          className={`w-3 h-12 rounded-full mr-3`}
          style={{ backgroundColor: color }}
        />
        <div className="flex-grow text-left">
          <h2 className="text-base font-medium text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 line-clamp-1">{description}</p>
          <div className="text-xs text-indigo-600 mt-1">{meta}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </button>
  );
}