export default {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Mark this post as featured to highlight it',
      initialValue: false
    },
    {
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      options: {
        hotspot: true
      },
      fields: [
        {
          name: 'alt',
          title: 'Alternative Text',
          type: 'string',
          description: 'Important for SEO and accessibility'
        },
        {
          name: 'caption',
          title: 'Caption',
          type: 'string'
        }
      ]
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      description: 'A short summary of the post',
      validation: (Rule: any) => Rule.max(300)
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'tag' } }]
    },
    {
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
            { title: 'Code Block', value: 'code' }
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' }
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL'
                  },
                  {
                    name: 'blank',
                    type: 'boolean',
                    title: 'Open in new tab',
                    initialValue: true
                  }
                ]
              }
            ]
          }
        },
        // Image
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
              description: 'Important for SEO and accessibility'
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption'
            },
            {
              name: 'fullWidth',
              type: 'boolean',
              title: 'Full Width',
              description: 'Display image at full width',
              initialValue: false
            }
          ]
        },
        // YouTube Video
        {
          name: 'youtube',
          type: 'object',
          title: 'YouTube Video',
          fields: [
            {
              name: 'url',
              type: 'url',
              title: 'YouTube URL'
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption'
            }
          ],
          preview: {
            select: {
              url: 'url'
            },
            prepare({ url }: { url: string }) {
              return {
                title: 'YouTube Video',
                subtitle: url
              }
            }
          }
        },
        // Code Snippet
        {
          name: 'codeSnippet',
          type: 'object',
          title: 'Code Snippet',
          fields: [
            {
              name: 'code',
              type: 'text',
              title: 'Code'
            },
            {
              name: 'language',
              type: 'string',
              title: 'Language',
              options: {
                list: [
                  { title: 'JavaScript', value: 'javascript' },
                  { title: 'TypeScript', value: 'typescript' },
                  { title: 'HTML', value: 'html' },
                  { title: 'CSS', value: 'css' },
                  { title: 'SCSS', value: 'scss' },
                  { title: 'JSON', value: 'json' },
                  { title: 'Bash', value: 'bash' },
                  { title: 'Python', value: 'python' },
                  { title: 'React/JSX', value: 'jsx' },
                  { title: 'PHP', value: 'php' }
                ]
              }
            },
            {
              name: 'filename',
              type: 'string',
              title: 'Filename (optional)'
            }
          ]
        },
        // Image Carousel
        {
          name: 'imageCarousel',
          type: 'object',
          title: 'Image Carousel',
          fields: [
            {
              name: 'images',
              type: 'array',
              title: 'Images',
              of: [
                {
                  type: 'image',
                  options: { hotspot: true },
                  fields: [
                    {
                      name: 'alt',
                      type: 'string',
                      title: 'Alternative Text'
                    },
                    {
                      name: 'caption',
                      type: 'string',
                      title: 'Caption'
                    }
                  ]
                }
              ],
              validation: (Rule: any) => Rule.min(2).error('A carousel needs at least 2 images')
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Carousel Caption'
            }
          ]
        },
        // Call to Action
        {
          name: 'callToAction',
          type: 'object',
          title: 'Call to Action',
          fields: [
            {
              name: 'text',
              type: 'string',
              title: 'Button Text'
            },
            {
              name: 'url',
              type: 'url',
              title: 'URL'
            },
            {
              name: 'style',
              type: 'string',
              title: 'Style',
              options: {
                list: [
                  { title: 'Primary', value: 'primary' },
                  { title: 'Secondary', value: 'secondary' },
                  { title: 'Ghost', value: 'ghost' }
                ]
              },
              initialValue: 'primary'
            }
          ]
        },
        // Quote Block
        {
          name: 'quoteBlock',
          type: 'object',
          title: 'Quote Block',
          fields: [
            {
              name: 'quote',
              type: 'text',
              title: 'Quote'
            },
            {
              name: 'attribution',
              type: 'string',
              title: 'Attribution'
            }
          ]
        },
        // Interactive Component
        {
          name: 'interactiveComponent',
          type: 'object',
          title: 'Interactive Component',
          fields: [
            {
              name: 'componentName',
              title: 'Component',
              type: 'string',
              description: 'Select the interactive component to embed',
              options: {
                list: [
                  { title: 'Hero Compression Animation', value: 'HeroCompression' },
                ],
              },
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional caption displayed below the component',
            },
          ],
          preview: {
            select: { title: 'componentName', caption: 'caption' },
            prepare({ title, caption }: { title?: string; caption?: string }) {
              return {
                title: `Interactive: ${title || 'Not selected'}`,
                subtitle: caption || '',
              }
            },
          },
        },
        // Divider
        {
          name: 'divider',
          type: 'object',
          title: 'Divider',
          fields: [
            {
              name: 'style',
              type: 'string',
              title: 'Style',
              options: {
                list: [
                  { title: 'Line', value: 'line' },
                  { title: 'Dots', value: 'dots' },
                  { title: 'Dashed', value: 'dashed' }
                ]
              },
              initialValue: 'line'
            }
          ]
        }
      ]
    },
    {
      name: 'externalLinks',
      title: 'External Links',
      type: 'array',
      description: 'Add links to external resources, GitHub repos, live demos, etc.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'title',
              type: 'string',
              title: 'Title'
            },
            {
              name: 'url',
              type: 'url',
              title: 'URL'
            },
            {
              name: 'icon',
              type: 'string',
              title: 'Icon',
              description: 'Icon name from react-icons (e.g., FaGithub, FaGlobe)',
              options: {
                list: [
                  { title: 'GitHub', value: 'FaGithub' },
                  { title: 'Globe/Website', value: 'FaGlobe' },
                  { title: 'LinkedIn', value: 'FaLinkedin' },
                  { title: 'Twitter', value: 'FaTwitter' },
                  { title: 'YouTube', value: 'FaYoutube' },
                  { title: 'CodePen', value: 'FaCodepen' },
                  { title: 'External Link', value: 'FaExternalLinkAlt' }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: 'viewCount',
      title: 'View Count',
      type: 'number',
      initialValue: 0,
      readOnly: true
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Title',
          type: 'string',
          description: 'Title used for search engines and browser tabs',
          validation: (Rule: any) => Rule.max(60).warning('Longer titles may be truncated by search engines')
        },
        {
          name: 'metaDescription',
          title: 'Meta Description',
          type: 'text',
          description: 'Description for search engines',
          validation: (Rule: any) => Rule.max(160).warning('Longer descriptions may be truncated by search engines')
        },
        {
          name: 'shareImage',
          title: 'Share Image',
          type: 'image',
          description: 'Image used for social media sharing (1200x630px recommended)'
        }
      ]
    }
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage'
    }
  },
  orderings: [
    {
      title: 'Publication Date, New',
      name: 'publishedAtDesc',
      by: [
        { field: 'publishedAt', direction: 'desc' }
      ]
    },
    {
      title: 'Publication Date, Old',
      name: 'publishedAtAsc',
      by: [
        { field: 'publishedAt', direction: 'asc' }
      ]
    },
    {
      title: 'Title',
      name: 'titleAsc',
      by: [
        { field: 'title', direction: 'asc' }
      ]
    },
    {
      title: 'View Count',
      name: 'viewCountDesc',
      by: [
        { field: 'viewCount', direction: 'desc' }
      ]
    }
  ]
} 