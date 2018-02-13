// @flow

import { isAction, isNotFound } from '../../utils'
import { notFound } from '../../actions'
import { handleError } from './index'

export default (
  route: Object, // primary type
  type: string,
  key: ?string,
  basename: ?string
) => {
  const ac = typeof route[key] === 'function' ? route[key] : null // look for action creators on route

  // `info` arg contains 'isThunk' or optional `path` for `notFound` action creators
  const defaultCreator = (arg: Object | Function, info: ?string) => {

    // optionally handle action creators that return functions (aka `thunk`)
    if (typeof arg === 'function') {
      const thunk: Function = arg
      return (...args: Array<any>) => {
        return defaultCreator(thunk(...args), 'isThunk')
      }
    }

    // do nothing if a `thunk` returned nothing (i.e. manually used `dispatch`)
    if (info === 'isThunk' && arg === undefined) return

    // for good measure honor promises (`dispatch` will have manually been used)
    if (info === 'isThunk' && arg && arg.then) return arg

    // use built-in `notFound` action creator if `NOT_FOUND` type
    const t = (arg && arg.type) || type
    if (isNotFound(t)) {
      const notFoundPath = info === 'isThunk' ? null : info
      const act = notFound(arg, notFoundPath, t)
      if (basename) act.basename = basename
      return act
    }

    // handle error action creator
    if (key === 'error') return handleError(arg, t, basename)

    // the default behavior of transforming an `arg` object into an action with its type
    if (isAction(arg)) return { type, basename, ...arg }

    // if no `payload`, `query`, etc, treat arg as a `params/payload` for convenience
    const name = key === 'complete' ? 'payload' : 'params'
    return { type, [name]: arg || {}, basename }
  }

  // optionally allow custom action creators
  if (ac) {
    return (...args: Array<any>) => defaultCreator(ac(...args))
  }

  // primary use case: generate an action creator (will only trigger last lines of `defaultCreator`)
  return defaultCreator
}

