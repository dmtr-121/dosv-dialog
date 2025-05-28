/**
 * Medical dialogue categories definition file with multi-level structure
 * Top level: Courses
 * Middle level: Modules
 * Bottom level: Individual dialogues
 */

// Basic type for medical icon names
type MedicalIconName = 'users' | 'heart-pulse' | 'scroll-text' | 'stethoscope' | string;

/**
 * DialogueModule interface - represents a module within a course
 */
interface DialogueModule {
  id: string;
  name: string;
  description: string;
  icon: MedicalIconName;
  dialogues: string[];
}

/**
 * Course interface - top level category containing modules
 */
interface Course {
  id: string;
  name: string;
  description: string;
  icon: MedicalIconName;
  modules: DialogueModule[];
}

/**
 * Main array of courses (top-level categories)
 */
export const courses: Course[] = [
  {
    id: 'ClinCases',
    name: 'ClinCases',
    description: '🩺 Foundation course for medical professionals',
    icon: 'stethoscope',
    modules: [
      {
        id: 'Cases',
        name: 'Cases',
        description: '📚 Basic medical vocabulary and terms',
        icon: 'scroll-text',
        dialogues: [
          'case3',
          'case4',
          'case5'
        ]
      },
      {
        id: 'marathon1-4',
        name: 'marathon1-4',
        description: '📚 Basic medical vocabulary and terms',
        icon: 'scroll-text',
        dialogues: [
          'Scenario 1',
          'Scenario 1.4',
          'Scenario 2',
          'Scenario 2.4'
        ]
      },
      {
        id: 'patient-communication',
        name: 'Patient Communication',
        description: '👥 Communicating effectively with patients',
        icon: 'users',
        dialogues: []
      }
    ]
  },
  {
    id: 'medical-english-advanced',
    name: 'Medical English: Advanced',
    description: '🔬 Advanced course for experienced healthcare professionals',
    icon: 'heart-pulse',
    modules: [
      {
        id: 'specialty-consultations',
        name: 'Specialty Consultations',
        description: '👨‍⚕️ Specialized medical consultations',
        icon: 'heart-pulse',
        dialogues: []
      },
      {
        id: 'medical-research',
        name: 'Medical Research',
        description: '🧪 Research and academic terminology',
        icon: 'scroll-text',
        dialogues: []
      }
    ]
  },
  {
    id: 'dentistry1',
    name: 'Dent',
    description: '🎧 Practice with audio support',
    icon: 'scroll-text',
    modules: [
      {
        id: 'module',
        name: 'Course 1',
        description: '🔊 Dialogue practice with audio',
        icon: 'scroll-text',
        dialogues: []
      }
    ]
  }
];

/**
 * Helper function to add new dialogue to a module
 */
export const addDialogueToModule = (courseId: string, moduleId: string, dialogueId: string) => {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  
  const module = course.modules.find(m => m.id === moduleId);
  if (module && !module.dialogues.includes(dialogueId)) {
    module.dialogues.push(dialogueId);
  }
};

/**
 * Helper function to add a new module to a course
 */
export const addModuleToCourse = (courseId: string, module: DialogueModule) => {
  const course = courses.find(c => c.id === courseId);
  if (course && !course.modules.some(m => m.id === module.id)) {
    course.modules.push(module);
  }
};

/**
 * Helper function to create a new course
 */
export const createCourse = (course: Course) => {
  if (!courses.some(c => c.id === course.id)) {
    courses.push(course);
  }
};

/**
 * Helper function to update course details
 */
export const updateCourse = (courseId: string, updates: Partial<Omit<Course, 'id' | 'modules'>>) => {
  const course = courses.find(c => c.id === courseId);
  if (course) {
    Object.assign(course, updates);
  }
};

/**
 * Helper function to update module details
 */
export const updateModule = (
  courseId: string, 
  moduleId: string, 
  updates: Partial<Omit<DialogueModule, 'id' | 'dialogues'>>
) => {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  
  const module = course.modules.find(m => m.id === moduleId);
  if (module) {
    Object.assign(module, updates);
  }
};

/**
 * Helper function to remove a dialogue from a module
 */
export const removeDialogueFromModule = (courseId: string, moduleId: string, dialogueId: string) => {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  
  const module = course.modules.find(m => m.id === moduleId);
  if (module) {
    module.dialogues = module.dialogues.filter(id => id !== dialogueId);
  }
};

/**
 * Helper function to remove a module from a course
 */
export const removeModuleFromCourse = (courseId: string, moduleId: string) => {
  const course = courses.find(c => c.id === courseId);
  if (course) {
    course.modules = course.modules.filter(m => m.id !== moduleId);
  }
};

/**
 * Helper function to find a course by dialogue ID
 */
export const findCourseByDialogueId = (dialogueId: string): Course | undefined => {
  return courses.find(course => 
    course.modules.some(module => 
      module.dialogues.includes(dialogueId)
    )
  );
};

/**
 * Helper function to find a module by dialogue ID
 */
export const findModuleByDialogueId = (dialogueId: string): { course: Course, module: DialogueModule } | undefined => {
  for (const course of courses) {
    const module = course.modules.find(m => m.dialogues.includes(dialogueId));
    if (module) {
      return { course, module };
    }
  }
  return undefined;
};

/**
 * Helper function to get all dialogues from all courses and modules
 */
export const getAllDialogues = (): string[] => {
  return courses.flatMap(course => 
    course.modules.flatMap(module => 
      module.dialogues
    )
  );
};

// For backward compatibility
export const dialogueCategories = courses.flatMap(course => 
  course.modules.map(module => ({
    id: `${course.id}-${module.id}`,
    name: `${course.name}: ${module.name}`,
    description: module.description,
    icon: module.icon,
    dialogues: module.dialogues
  }))
);