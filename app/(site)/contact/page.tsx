"use client"

import React, { useState } from 'react'
import { FaLinkedin, FaCopy, FaCheck, FaGithub, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { MdEmail, MdArrowForward } from 'react-icons/md'
import '../../css/animations.css'
import '../../css/magical-button.css'
import '../../css/page.css'
import PageLayout from '../../components/PageLayout'
import ScrollToTop from '../../components/ScrollToTop'

export default function ContactPage() {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);

  const copyToClipboard = (text: string, type: 'email' | 'location') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedLocation(true);
        setTimeout(() => setCopiedLocation(false), 2000);
      }
    });
  };

  return (
    <PageLayout center={false} className="pt-6">
      <ScrollToTop />
      <div className="max-w-none">
        <h2 className="mb-1 text-xl md:text-2xl font-bold">Get in Touch</h2>
        <p className="text-sm text-muted-foreground mb-1">Feel free to reach out — I&apos;m always open to new opportunities and conversations.</p>
        <ul className="space-y-2 mt-4">
          <li className="relative">
            <button
              onClick={() => copyToClipboard('Chicago, IL', 'location')}
              className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group w-full text-left"
              aria-label="Copy location to clipboard"
            >
              <div className="flex items-center gap-3">
                <FaMapMarkerAlt className="text-primary text-xl" />
                <div>
                  <div className="text-primary font-medium">Location</div>
                  <div className="text-sm text-muted-foreground">Chicago, IL</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center">
                {copiedLocation ? <FaCheck className="text-green-500" /> : <FaCopy />}
              </div>
            </button>
          </li>

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
              href="https://x.com/jakeharrisdev"
              target="_blank"
              rel="noopener noreferrer"
              className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group"
              aria-label="Visit X profile"
            >
              <div className="flex items-center gap-3">
                <FaXTwitter className="text-primary text-xl" />
                <div>
                  <div className="text-primary font-medium">X</div>
                  <div className="text-sm text-muted-foreground">@jakeharrisdev</div>
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
                  <div className="text-sm text-muted-foreground">Check out my code</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <MdArrowForward />
              </div>
            </a>
          </li>

          <li className="relative">
            <a
              href="https://cal.com/jakejh"
              target="_blank"
              rel="noopener noreferrer"
              className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group"
              aria-label="Schedule a call"
            >
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-primary text-xl" />
                <div>
                  <div className="text-primary font-medium">Schedule a Call</div>
                  <div className="text-sm text-muted-foreground">Book time on my calendar</div>
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