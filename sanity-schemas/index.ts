import post from './post'
import tag from './tag'
import { postFigureTypes } from './post-figures'
import { runFigureTypes } from './run-figures'

export const schemaTypes = [
  post,
  tag,
  ...postFigureTypes,
  ...runFigureTypes,
] 