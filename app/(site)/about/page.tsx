import PageLayout from '../../components/PageLayout';
import Link from 'next/link';
import { FaDownload, FaGithub } from 'react-icons/fa';
import '../../css/page.css';
import '../../css/animations.css';
import { MdArrowForward } from 'react-icons/md';

export const metadata = {
    title: "About",
    description: "Jake Harris is a Full Stack Developer with experience in AI-powered applications, startup development, and consulting. Learn about his background, skills, and projects.",
    alternates: {
        canonical: 'https://jakejh.com/about/',
    },
};

const aboutContent = {
    paragraphs: [
        "I grew up in Atlanta, where I co-founded Lions Heart, a youth volunteer organization that coordinated more than 10,000 hours of community service across the city.",
        "I moved to Washington, DC to study computer science at George Washington University and row Division I. Our crew finished seventh at the IRA National Championship, an experience that taught me consistency, trust, and teamwork.",
        "After college, I brought that mindset to AdventureGenie, an AI travel startup I co-founded. I led the frontend and design, helped raise $3 million, and watched the platform grow past 50,000 monthly users. It taught me to work across the whole problem, from a customer’s first impression to the infrastructure behind it, and showed me that AI works best when it shapes the product from the beginning.",
        "That experience led me to start JJH Digital, where I build and operate software for clients who need more than a template. I’ve delivered full-stack, e-commerce, membership, and AI systems, owning projects from the first conversation through launch and long-term operation.",
        "Today I’m a software engineer on Docusign’s Workspaces team, shipping customer-facing features and production systems while helping engineers across the company work more effectively with AI. I’m especially interested in context engineering and multi-agent systems: not just what models can do, but how we design the memory, tools, and workflows that let them do useful work reliably.",
        "I’m most at home working on hard problems with small teams, especially when I can stay close to both the people using the product and the systems behind it."
    ]
};

export default function AboutPage() {
    return (
        <PageLayout className="py-20 md:py-24">
            <div className="max-w-none">
                <h1
                    className="page-enter mb-6 text-5xl font-bold leading-[0.95] tracking-[-0.01em] md:text-6xl"
                    style={{ fontFamily: 'var(--font-wordmark-stack)' }}
                >
                    About
                </h1>

                <div className="page-enter-2 prose dark:prose-invert font-base text-base mb-8">
                    {aboutContent.paragraphs.map((paragraph, index) => (
                        <p key={index} className={index < aboutContent.paragraphs.length - 1 ? "mb-4" : ""}>
                            {paragraph}
                        </p>
                    ))}
                </div>

                <ul className="page-enter-3 space-y-2">
                    {/* Resume download temporarily disabled because the resume is out of date
                    <li className="relative">
                        <Link
                            href="/JH Resume 2-13-25 Fullstack.pdf"
                            className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group"
                            aria-label="Download resume"
                            target="_blank"
                            download
                        >
                            <div className="flex items-center gap-3">
                                <FaDownload className="text-primary text-xl" />
                                <div>
                                    <div className="text-primary font-medium">Resume</div>
                                    <div className="text-sm text-muted-foreground">Download my resume</div>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <FaDownload />
                            </div>
                        </Link>
                    </li>
                    */}
                    <li className="relative">
                        <a
                            href="https://github.com/jakejharris"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group"
                            aria-label="Visit GitHub profile"
                        >
                            <div className="flex items-center gap-3">
                                <FaGithub className="text-primary text-xl" />
                                <div>
                                    <div className="text-primary font-medium">GitHub</div>
                                    <div className="text-sm text-muted-foreground">Check out my code</div>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <MdArrowForward />
                            </div>
                        </a>
                    </li>
                </ul>
            </div>
        </PageLayout>
    );
}
