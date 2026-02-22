import PageLayout from '../../components/PageLayout';
import Link from 'next/link';
import { FaDownload, FaGithub } from 'react-icons/fa';
import '../../css/page.css';
import '../../css/animations.css';
import { MdArrowForward } from 'react-icons/md';
import ScrollToTop from '../../components/ScrollToTop';

export const metadata = {
    title: "About",
    description: "Jake Harris is a Full Stack Developer with experience in AI-powered applications, startup development, and consulting. Learn about his background, skills, and projects.",
    alternates: {
        canonical: 'https://jakejh.com/about/',
    },
};

const aboutContent = {
    paragraphs: [
        "I\u2019m Jake Harris, a software engineer at Docusign and the founder of JJH Digital, a software consultancy.",
        "At Docusign I work on the Workspaces team. I built the team\u2019s cronjobs infrastructure from scratch, wrote a 200-page API parity analysis that became the reference for our global expansion initiative, and deployed Redis and CosmosDB across six production regions. I lead incident response for major releases and I\u2019ve driven AI tooling adoption across the engineering org. The stack is C#/.NET, gRPC, Kubernetes, and Azure.",
        "Before Docusign, I co-founded AG, an AI-powered travel platform. I led frontend development, helped raise $3M in funding, and grew the platform to 50,000 monthly users. That experience is where I developed a conviction that AI isn\u2019t something you bolt on at the end. It\u2019s an architecture decision you make on day one.",
        "Through JJH Digital I take on consulting work for businesses that need more than a template. Full stack applications, AI integrations, custom e-commerce platforms. TypeScript, React, Next.js, and whatever else the problem calls for. Clients own their code.",
        "I spend a lot of time thinking about AI beyond just using it. Lately I\u2019ve been exploring recursive semantic compression, the idea that intelligence doesn\u2019t scale by making context windows bigger, it scales by compressing information the way biological cognition does, layer by layer. I\u2019ve built agent workflows on enterprise codebases, I write about it on this blog, and my working thesis is that the bottleneck in AI right now isn\u2019t capability. It\u2019s context.",
        "I studied Computer Science at George Washington University, where I rowed Division I and contributed to a 7th place national finish at the IRA Championship. After college I coached my high school rowing club for a season where the team put up multiple podium finishes at Youth Nationals, which for a club out of Atlanta is kind of unheard of. Before any of that, I co-founded Lions Heart, a youth volunteer organization that facilitated over 10,000 hours of community service across metro Atlanta.",
        "I build what works today and chase what will work tomorrow. That\u2019s the whole game."
    ]
};

export default function AboutPage() {
    return (
        <PageLayout>
            <ScrollToTop />
            <div className="max-w-none">
                <h2 className="mb-4 text-xl md:text-2xl font-bold">About</h2>

                <div className="prose dark:prose-invert font-base text-base mb-8">
                    {aboutContent.paragraphs.map((paragraph, index) => (
                        <p key={index} className={index < aboutContent.paragraphs.length - 1 ? "mb-4" : ""}>
                            {paragraph}
                        </p>
                    ))}
                </div>

                <ul className="space-y-2">
                    {/* Resume download temporarily disabled — resume is out of date
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