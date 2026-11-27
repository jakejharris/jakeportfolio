import post from './post'
import tag from './tag'
import { postFigureTypes } from './post-figures'

export const schemaTypes = [
  post,
  tag,
  ...postFigureTypes,
] 