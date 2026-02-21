import { StructureBuilder } from 'sanity/structure'
import { FiFileText, FiTag } from 'react-icons/fi'

export const structure = (S: StructureBuilder) => {
  return S.list()
    .title('Content')
    .items([
      // Posts with different views
      S.listItem()
        .title('Posts')
        .icon(FiFileText)
        .child(
          S.list()
            .title('Posts')
            .items([
              // All posts
              S.listItem()
                .title('All Posts')
                .child(
                  S.documentList()
                    .title('All Posts')
                    .filter('_type == "post"')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
                ),

              // Featured posts
              S.listItem()
                .title('Featured Posts')
                .child(
                  S.documentList()
                    .title('Featured Posts')
                    .filter('_type == "post" && featured == true')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
                ),

              // Posts by tag (dynamic list based on existing tags)
              S.listItem()
                .title('Posts by Tag')
                .child(
                  S.documentTypeList('tag')
                    .title('Posts by Tag')
                    .child(tagId =>
                      S.documentList()
                        .title('Posts')
                        .filter('_type == "post" && $tagId in tags[]._ref')
                        .params({ tagId })
                    )
                )
            ])
        ),

      // Tags management
      S.listItem()
        .title('Tags')
        .icon(FiTag)
        .child(S.documentTypeList('tag').title('Tags')),

      // Divider
      S.divider(),

      // Regular document types
      ...S.documentTypeListItems().filter(
        (listItem) => !['post', 'tag'].includes(listItem.getId() as string)
      )
    ])
}
