export default {
  name: 'tag',
  title: 'Tag',
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
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Brief description of what this tag represents'
    },
    {
      name: 'color',
      title: 'Color',
      type: 'string',
      description: 'Color code for the tag (hex, rgb, etc.)',
      validation: (Rule: any) => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).warning('Please enter a valid hex color code')
    }
  ]
} 