import { Badge } from "./ui/badge";

const SKILLS = {
  languages: ["TypeScript", "Python", "JavaScript", "SQL", "Go"],
  frameworks: ["React", "Next.js", "Node.js", "FastAPI", "Tailwind CSS"],
  tools: ["Git", "Docker", "PostgreSQL", "Redis", "AWS"],
  ai: ["OpenAI API", "LangChain", "RAG", "Prompt Engineering"],
};

export default function SkillsSection() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Technical Skills</h3>
      {Object.entries(SKILLS).map(([category, skills]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
            {category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
