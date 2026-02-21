"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion"
import { Button } from "@/app/components/ui/button"
import { ExternalLink, List } from "lucide-react"
import { PortableTextBlock } from "@portabletext/types"
import { Separator } from "@/app/components/ui/separator"

interface TableOfContentsProps {
  content: PortableTextBlock[]
  externalLinks?: Array<{ title: string; url: string; icon: string }>
}

interface HeadingItem {
  text: string
  id: string
  isExternalLink?: boolean
  url?: string
  isHeading?: boolean
}

export default function TableOfContents({ content, externalLinks }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])

  // Extract headings from content (h1–h4 heading blocks)
  const extractHeadings = useCallback(() => {
    const extractedHeadings: HeadingItem[] = []

    if (!content || !Array.isArray(content)) return []

    content.forEach((block) => {
      if (block._type === 'block' && ['h1', 'h2', 'h3', 'h4'].includes(block.style || '')) {
        const text = block.children?.map((child: any) => child.text).join('') || ''
        if (text.trim().length > 0) {
          extractedHeadings.push({
            text: text.trim(),
            id: `section-${block._key}`,
          })
        }
      }
    })

    // Add external links if available
    if (externalLinks && externalLinks.length > 0) {
      extractedHeadings.push({
        text: "External Links",
        id: "external-links",
        isHeading: true
      })

      // Add each external link as a sub-item
      externalLinks.forEach((link) => {
        extractedHeadings.push({
          text: link.title,
          id: "external-links", // Same ID to scroll to the external links section
          isExternalLink: true,
          url: link.url
        })
      })
    }

    return extractedHeadings
  }, [content, externalLinks])

  useEffect(() => {
    const extracted = extractHeadings()
    setHeadings(extracted)
  }, [content, externalLinks, extractHeadings])

  const scrollToHeading = (id: string, url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    const element = document.getElementById(id)
    if (element) {
      // Calculate position with offset
      const elementPosition = element.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - (window.innerWidth >= 768 ? 150 : 100)
      
      // Scroll to the element with offset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      
      // Add a highlight effect
      element.classList.add('bg-primary/10')
      setTimeout(() => {
        element.classList.remove('bg-primary/10')
      }, 2000) // Remove highlight after 2 seconds
    }
  }

  if (headings.length === 0) {
    return null
  }

  // Get all the actual article headings (not external links)
  const hasArticleHeadings = headings.some(h => !h.isExternalLink && !h.isHeading)
  const hasExternalLinks = headings.some(h => h.isExternalLink || h.isHeading)

  return (
    <div className="my-8 bg-muted/50 rounded-md p-0.5">
      <Accordion type="single" collapsible defaultValue={undefined} className="w-full">
        <AccordionItem value="toc" className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/80 rounded-t-md">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5" />
              <span className="font-medium">In This Article</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <nav aria-label="Table of contents">
              <ul className="space-y-1 pt-2">
                {hasArticleHeadings && 
                  headings
                    .filter(h => !h.isExternalLink && !h.isHeading)
                    .map((heading, index) => (
                      <li key={`content-${index}`} className="border-l-2 border-transparent hover:border-primary pl-3 -ml-3 transition-colors">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="w-full justify-start text-left text-sm hover:bg-transparent hover:text-primary p-1 h-auto font-normal whitespace-normal"
                          onClick={() => scrollToHeading(heading.id)}
                        >
                          {heading.text}
                        </Button>
                      </li>
                    ))
                }
                
                {hasArticleHeadings && hasExternalLinks && (
                  <li className="py-2">
                    <Separator />
                  </li>
                )}
                
                {hasExternalLinks && (
                  <>
                    {/* {headings
                      .filter(h => h.isHeading)
                      .map((heading, index) => (
                        <li key={`heading-${index}`} className="font-medium text-sm pt-1 pb-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full justify-start text-left font-medium hover:bg-transparent hover:text-primary p-1 h-auto"
                            onClick={() => scrollToHeading(heading.id)}
                          >
                            {heading.text}
                          </Button>
                        </li>
                      ))
                    } */}
                    
                    {headings
                      .filter(h => h.isExternalLink)
                      .map((heading, index) => (
                        <li key={`external-${index}`} className="border-l-2 border-transparent transition-colors">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full justify-start text-left text-sm hover:bg-transparent hover:text-primary p-1 h-auto font-normal flex items-center gap-2"
                            onClick={() => scrollToHeading(heading.id, heading.url)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {heading.text}
                          </Button>
                        </li>
                      ))
                    }
                  </>
                )}
              </ul>
            </nav>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
} 