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
                                    className="object-cover w-full h-full rounded-full transition-all duration-500 filter grayscale group-hover:grayscale-0"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert font-medium text-lg">
                        <p className="mb-4">
                            I&apos;m Jake Harris, a Frontend Developer and Designer with a passion for creating intuitive,
                            user-friendly web experiences. With several years of experience in the industry, I&apos;ve developed
                            a keen eye for design and a deep understanding of modern web technologies.
                        </p>

                        <p className="mb-4">
                            My journey in web development began with a curiosity about how digital experiences are crafted.
                            That curiosity evolved into a career focused on building responsive, accessible, and visually
                            appealing applications that solve real problems for users.
                        </p>

                        <p className="mb-4">
                            I specialize in React, Next.js, TypeScript, and modern frontend frameworks, always staying
                            current with the latest web standards and best practices. My approach combines technical
                            expertise with design sensibility, ensuring that the applications I build are not only
                            functional but also aesthetically pleasing.
                        </p>

                        <p className="mb-4">
                            When I&apos;m not coding, I enjoy exploring new design trends, contributing to open-source
                            projects, and continuously expanding my skillset through learning and experimentation.
                            I believe that great digital products come from a balance of technical excellence,
                            thoughtful design, and a deep understanding of user needs.
                        </p>

                        <p>
                            I&apos;m always open to new opportunities and collaborations. Feel free to reach out if you&apos;d
                            like to discuss a project or just connect!
                        </p>
                    </div>
                </div>

                {/* Desktop layout - text wraps around image */}
                <div className="hidden md:block relative mb-8">
                    <div className="float-right ml-6 mb-4 relative w-full max-w-[200px] aspect-square">
                        <div className="group relative w-full h-full">
                            <Image
                                src="/images/4.png"
                                alt="Jake Harris headshot"
                                width={200}
                                height={200}
                                className="object-cover w-full h-full rounded-full transition-all duration-500 filter grayscale group-hover:grayscale-0"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert font-medium text-lg">
                        <p className="mb-4">
                            I&apos;m Jake Harris, a Frontend Developer and Designer with a passion for creating intuitive,
                            user-friendly web experiences. With several years of experience in the industry, I&apos;ve developed
                            a keen eye for design and a deep understanding of modern web technologies.
                        </p>

                        <p className="mb-4">
                            My journey in web development began with a curiosity about how digital experiences are crafted.
                            That curiosity evolved into a career focused on building responsive, accessible, and visually
                            appealing applications that solve real problems for users.
                        </p>

                        <p className="mb-4">
                            I specialize in React, Next.js, TypeScript, and modern frontend frameworks, always staying
                            current with the latest web standards and best practices. My approach combines technical
                            expertise with design sensibility, ensuring that the applications I build are not only
                            functional but also aesthetically pleasing.
                        </p>

                        <p className="mb-4">
                            When I&apos;m not coding, I enjoy exploring new design trends, contributing to open-source
                            projects, and continuously expanding my skillset through learning and experimentation.
                            I believe that great digital products come from a balance of technical excellence,
                            thoughtful design, and a deep understanding of user needs.
                        </p>

                        <p>
                            I&apos;m always open to new opportunities and collaborations. Feel free to reach out if you&apos;d
                            like to discuss a project or just connect!
                        </p>
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