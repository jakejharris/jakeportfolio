"use client"

import React, { useState } from 'react'
import { FaLinkedin, FaGithub, FaCopy, FaCheck } from 'react-icons/fa'
import { MdEmail, MdArrowForward } from 'react-icons/md'
import '../css/animations.css'
import '../css/magical-button.css'
import '../css/page.css'
import PageLayout from '../components/PageLayout'
import ScrollToTop from '../components/ScrollToTop'

export default function ContactPage() {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyToClipboard = (text: string, type: 'email' | 'location') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        // Handle other types if needed in the future
        setTimeout(() => {}, 2000);
      }
    });
  };

  return (
    <PageLayout center={false} className="pt-6">
      <ScrollToTop />
      <div className="max-w-none">
        <h2 className="mb-4 text-xl md:text-2xl font-bold">Get in Touch</h2>        
        <ul className="space-y-2">
          <li className="relative">
            <button 
              onClick={() => copyToClipboard('jake@jjhdigital.com', 'email')}
              className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group w-full text-left"
              aria-label="Copy email to clipboard"
            >
              <div className="flex items-center gap-3">
                <MdEmail className="text-primary text-xl" />
                <div>
                  <div className="text-primary font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">jake@jjhdigital.com</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center">
                {copiedEmail ? <FaCheck className="text-green-500" /> : <FaCopy />}
              </div>
            </button>
          </li>
          
          <li className="relative">
            <a
              href="https://linkedin.com/in/jakejh"
              target="_blank"
              rel="noopener noreferrer"
              className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group"
              aria-label="Visit LinkedIn profile"
            >
              <div className="flex items-center gap-3">
                <FaLinkedin className="text-primary text-xl" />
                <div>
                  <div className="text-primary font-medium">LinkedIn</div>
                  <div className="text-sm text-muted-foreground">Connect with me professionally</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <MdArrowForward />
              </div>
            </a>
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
                  <div className="text-sm text-muted-foreground">Check out my open source projects</div>
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
  )
} 