interface SkillsSectionProps {
  skills?: string[];
  title?: string;
}

export default function SkillsSection({ skills, title = '我的技能' }: SkillsSectionProps) {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">{title}</h2>
      <div className="flex flex-wrap gap-3 justify-center">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="px-5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-full text-sm font-medium hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

