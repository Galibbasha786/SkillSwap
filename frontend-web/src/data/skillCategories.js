// frontend-web/src/data/skillCategories.js

export const skillCategories = [
  {
    name: 'Programming',
    icon: '💻',
    skills: [
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust',
      'React', 'Vue', 'Angular', 'Node.js', 'Django', 'Flask', 'Spring Boot',
      'HTML', 'CSS', 'TypeScript', 'PHP', 'Swift', 'Kotlin', 'SQL'
    ]
  },
  {
    name: 'Web Development',
    icon: '🌐',
    skills: [
      'Frontend Development', 'Backend Development', 'Full Stack',
      'Responsive Design', 'Progressive Web Apps', 'Web Performance',
      'SEO', 'WordPress', 'Shopify', 'Web Security'
    ]
  },
  {
    name: 'Mobile Development',
    icon: '📱',
    skills: [
      'iOS Development', 'Android Development', 'React Native',
      'Flutter', 'SwiftUI', 'Jetpack Compose', 'Mobile UI/UX'
    ]//heloo
  },
  {
    name: 'Data Science',
    icon: '📊',
    skills: [
      'Data Analysis', 'Machine Learning', 'Deep Learning',
      'Python for Data Science', 'R Programming', 'SQL',
      'Tableau', 'Power BI', 'Statistics', 'Big Data'
    ]
  },
  {
    name: 'Music',
    icon: '🎵',
    skills: [
      'Guitar', 'Piano', 'Drums', 'Violin', 'Voice Training',
      'Music Theory', 'Music Production', 'Songwriting',
      'DJ', 'Audio Engineering', 'Mixing & Mastering'
    ]
  },
  {
    name: 'Languages',
    icon: '🗣️',
    skills: [
      'English', 'Spanish', 'French', 'German', 'Italian',
      'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic',
      'Russian', 'Hindi', 'Sign Language'
    ]
  },
  {
    name: 'Design',
    icon: '🎨',
    skills: [
      'Graphic Design', 'UI/UX Design', 'Figma', 'Adobe Photoshop',
      'Adobe Illustrator', 'Adobe XD', 'Sketch', 'Canva',
      'Logo Design', 'Branding', 'Typography', 'Color Theory'
    ]
  },
  {
    name: 'Fitness',
    icon: '💪',
    skills: [
      'Personal Training', 'Yoga', 'Pilates', 'Strength Training',
      'Weight Loss Coaching', 'Nutrition', 'Meditation',
      'CrossFit', 'Running Coach', 'Dance Fitness'
    ]
  },
  {
    name: 'Business',
    icon: '💼',
    skills: [
      'Entrepreneurship', 'Marketing', 'Sales', 'Finance',
      'Project Management', 'Leadership', 'Public Speaking',
      'Negotiation', 'Business Strategy', 'Startup Advice'
    ]
  },
  {
    name: 'Art',
    icon: '🖌️',
    skills: [
      'Drawing', 'Painting', 'Sketching', 'Watercolor',
      'Digital Art', 'Procreate', 'Calligraphy', 'Pottery',
      'Sculpture', 'Art History', 'Comics & Manga'
    ]
  },
  {
    name: 'Cooking',
    icon: '🍳',
    skills: [
      'Baking', 'Pastry', 'International Cuisine', 'Meal Prep',
      'Vegan Cooking', 'Grilling', 'Wine Pairing', 'Food Styling'
    ]
  },
  {
    name: 'Photography',
    icon: '📷',
    skills: [
      'Portrait Photography', 'Landscape Photography', 'Street Photography',
      'Photo Editing', 'Lightroom', 'Photoshop', 'Videography',
      'Drone Photography', 'Lighting Techniques'
    ]
  }
];

// Flatten all skills for search
export const allSkills = skillCategories.reduce((acc, category) => {
  return [...acc, ...category.skills];
}, []);

// Get category for a specific skill
export const getSkillCategory = (skillName) => {
  for (const category of skillCategories) {
    if (category.skills.includes(skillName)) {
      return category.name;
    }
  }
  return 'Other';
};