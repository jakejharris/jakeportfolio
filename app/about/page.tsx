import PageLayout from '../components/PageLayout';
import Link from 'next/link';
import Image from 'next/image';
import { FaDownload, FaGithub } from 'react-icons/fa';
import '../css/page.css';
import '../css/animations.css';
import { MdArrowForward } from 'react-icons/md';
import ScrollToTop from '../components/ScrollToTop';

export const metadata = {
    title: "About - Jake Harris",
    description: "Learn more about Jake Harris - Developer and Designer",
};

const aboutContent = {
    paragraphs: [
        "I'm Jake Harris, a Full Stack Developer who builds AI-powered web applications. My background combines frontend development, entrepreneurship, and AI implementation.",
        "I studied Computer Science at George Washington University before co-founding Adventure Genie. There, I led frontend development for our AI trip planning platform, which secured $3M in funding and grew to 50,000 monthly users.",
        "Now I run JJH Digital, a consulting firm that delivers full stack solutions with AI integration. My projects include custom e-commerce platforms like Apres Surf Club, community websites, and HiHey.ai—an application that lets AI assistants handle phone calls autonomously.",
        "My technical toolkit includes TypeScript, React, Next.js, Python, AWS and Azure. I focus on creating clear interfaces for complex systems, making AI technology useful through good design.",
        "I build digital products that work. My approach combines solid architecture with practical problem-solving to create tools people actually want to use."
    ]
};

export default function AboutPage() {
    return (
        <PageLayout>
            <ScrollToTop />
            <div className="max-w-none">
                <h2 className="mb-4 text-xl md:text-2xl font-bold">About</h2>

                {/* Mobile layout - image first, then text */}
                <div className="md:hidden mb-8">
                    <div className="flex justify-center mb-6 bg-secondary rounded-sm">
                        <div className="relative w-[150px] aspect-square">
                            <div className="group relative w-full h-full">
                                <Image
                                    src="/images/4.png"
                                    alt="Jake Harris headshot"
                                    width={150}
                                    height={150}
                                    className="object-cover w-full h-full rounded-full transition-all duration-150 filter grayscale group-hover:grayscale-0"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert font-base text-base">
                        {aboutContent.paragraphs.map((paragraph, index) => (
                            <p key={index} className={index < aboutContent.paragraphs.length - 1 ? "mb-4" : ""}>
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Desktop layout - text wraps around image */}
                <div className="hidden md:block relative mb-8">
                    <div className="float-right ml-2 mb-4 relative w-full max-w-[150px] aspect-square">
                        <div className="group relative w-full h-full">
                            <Image
                                src="/images/4.png"
                                alt="Jake Harris headshot"
                                width={150}
                                height={150}
                                className="object-cover w-full h-full rounded-full transition-all duration-150 filter grayscale group-hover:grayscale-0"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-full"></div>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert font-base text-base">
                        {aboutContent.paragraphs.map((paragraph, index) => (
                            <p key={index} className={index < aboutContent.paragraphs.length - 1 ? "mb-4" : ""}>
                                {paragraph}
                            </p>
                        ))}
                    </div>
                    <div className="clear-both"></div>
                </div>

                <ul className="space-y-2">
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