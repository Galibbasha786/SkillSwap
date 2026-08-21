// Default resume data inspired by assets/FINAL_RESUME.pdf

export const RESUME_TEMPLATES = [
  {
    id: 'classic',
    name: 'Professional Classic',
    description: 'Single-column layout matching the SkillSwap reference resume — best for internships and tech roles.',
    reference: 'FINAL_RESUME'
  },
  {
    id: 'modern',
    name: 'Modern Header',
    description: 'Bold header with accent color and clean section dividers.',
    reference: 'online'
  },
  {
    id: 'minimal',
    name: 'Minimal ATS',
    description: 'Simple, readable format optimized for applicant tracking systems.',
    reference: 'online'
  }
];

export const EMPTY_RESUME = {
  personal: {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: ''
  },
  skills: '',
  internships: '',
  projects: '',
  certificates: '',
  achievements: '',
  activities: '',
  education: ''
};

export const SAMPLE_RESUME = {
  personal: {
    name: 'Syed Galib Basha',
    email: 'syedsunnygalibbasha@gmail.com',
    phone: '+91-7207314764',
    linkedin: 'linkedin.com/galibbasha786',
    github: 'github.com/Galibbasha786',
    portfolio: 'my-digital-showcase-seven.vercel.app'
  },
  skills: `Languages: Java, Kotlin, C++, Python
Web Technologies: HTML5, CSS, JavaScript, React, Node.js, Tailwind CSS, Express.js
Tools/Platforms: Android Studio, Git, GitHub, Docker, AWS, Vercel
Databases: MySQL, MongoDB, PostgreSQL
Soft Skills: Problem-Solving, Adaptability, Work-ethic, Decision-making`,
  internships: `AI Systems Evaluation Intern – Airdawg Labs | remote | July 2026 – Present
• Evaluated LLM outputs through structured testing methodologies emphasizing accuracy and safety.
• Designed prompts, documented observations, and contributed insights to improve model performance.`,
  projects: `Skill Swap – Skill Exchange Platform | GitHub | Live | January 2026 – April 2026
• Engineered a Full Stack MERN platform with real-time video sessions for peer-to-peer learning.
• Integrated JWT auth, role-based dashboards, exams, wallet and reward system.
• Tech: MongoDB, Express.js, React, Node.js, REST APIs, JWT, Jitsi Meet API

Virtu Gym – Smart Fitness Platform | GitHub | Live | April 2026 – May 2026
• Built a Laravel-based fitness platform with trainer dashboards and progress analytics.
• Tech: PHP, Laravel, MySQL, Tailwind CSS, REST APIs`,
  certificates: `Full Stack Web Development – Geeks For Geeks | November 2025
Cloud Computing – NPTEL Swayam | October 2025
C, Java, Python – HackerRank | October 2025`,
  achievements: `Scored 86% in CodeChef Skill Test of C++ | June 2025
Achieved 4 star rating in C++, Java, JS on HackerRank | January 2025
Maintained Top 30 in Diamond Leaderboard W3Schools | January 2025`,
  activities: `2nd runner-up in Visual Decode Challenge by CPE of LPU | May 2026
1st runner-up in Vanguard Society Quiz Mania Grammar Quiz | October 2025`,
  education: `Lovely Professional University | Phagwara, Punjab
B.Tech Computer Science and Engineering; CGPA: 8.38 | August 2023 – Present

Sri Chaitanya Junior College | Narasaraopet, Andhra Pradesh
Intermediate; Percentage: 92.7 | June 2022 – March 2023`
};

export const linesToBullets = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const profileToResumeDefaults = (user) => ({
  personal: {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    linkedin: '',
    github: '',
    portfolio: ''
  },
  skills: user?.skillsTeach?.map((skill) => `${skill.name} (${skill.experience || 'Teaching'})`).join('\n') || '',
  internships: '',
  projects: '',
  certificates: '',
  achievements: '',
  activities: user?.bio || '',
  education: user?.education?.institution
    ? `${user.education.institution}\n${user.education.degree || ''} ${user.education.fieldOfStudy || ''}`.trim()
    : ''
});
