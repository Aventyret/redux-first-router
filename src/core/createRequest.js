import { UPDATE_HISTORY, BLOCK, UNBLOCK } from '../types'
import { redirect } from '../actions'
import { isRedirect, noOp, createAction } from '../utils'
import { createFrom } from '../middleware/transformAction/utils'

export default (
  action,
  api,
  next
) => new Request(action, api, next)

export class Request {
  constructor(action, api, next) {
    const { store, routes, options, getLocation, ctx } = api
    const fromHistory = action.type === UPDATE_HISTORY
    const state = getLocation()
    const route = routes[action.type] || {}
    const prevRoute = state.kind === 'init'
      ? routes[state.prev.type] || {}
      : routes[state.type]

    // cancel pending not committed requests if new ones quickly come in
    if (route.path) {
      const requestNotCommitted = ctx.pending
      const isNewPipeline = !action.tmp

      if (requestNotCommitted && isNewPipeline) {
        requestNotCommitted.cancelled = this // `compose` will return early on pending requests, effectively cancelling them
      }

      ctx.pending = this
    }

    // the `tmp` context is passed along by all route-changing actions in the same primary parent
    // pipeline to keep track of things like `committed` status, but we don't want the
    // resulting action that leaves Rudy to have this, so we delete it.
    const tmp = action.tmp || {}
    delete action.tmp

    tmp.load = tmp.load || (fromHistory && action.nextHistory.kind === 'load')

    // a `committed` status must be marked for redirects initiated outside of the pipeline
    // so that `src/middleware/transformAction/reduxAction.js` knows to `replace` the
    // history entry instead of `push`
    if (!ctx.busy && isRedirect(action)) {
      tmp.committed = true
    }

    // maintain `busy` status throughout a primary parent route changing pipeline even if
    // there are pathlessRoutes, anonymousThunks (which don't have paths) called by them
    ctx.busy = ctx.busy || !!route.path || fromHistory

    Object.assign(this, options.extra)
    Object.assign(this, api)

    if (!fromHistory) {
      Object.assign(this, this.action) // for convenience (less destructuring in callbacks) our action key/vals are destructured into `Request` instances
      delete this.location // redirect action creator has this, and even though it causes no problems, we don't want it to prevent confusion
    }

    this.action = action
    this.tmp = tmp
    this.ctx = ctx
    this.route = route
    this.prevRoute = prevRoute
    this.initialState = store.getState()
    this.initialLocation = state
    this.error = null

    // commitHistory is supplied by history-generated actions, and by redux-generated actions
    // it will be added by the `transformAction` middleware, overwriting `noOp` below
    this.commitHistory = fromHistory ? action.commit : noOp
    this.commitDispatch = next // standard redux next dispatch from our redux middleware
    this.revertPop = fromHistory && action.revertPop // available when user uses browser back/next buttons. See `core/compose.js` for when it's called on a blocked route change

    this.getState = store.getState
  }

  commit = () => {
    this.ctx.pending = false
    this.tmp.committed = true

    return Promise.all([
      this.commitDispatch(this.action),
      this.commitHistory()
    ]).then(([res]) => res)
  }

  dispatch = (action) => {
    const { dispatch } = this.store
    const type = action && action.type
    const route = this.routes[type]

    if (route || typeof action === 'function') {
      action.tmp = this.tmp                      // keep the same `tmp` object across all redirects (or potential redirects in anonymous thunks)
    }

    if (this.ctx.busy && route && route.path) { // convert actions to redirects only if "busy" in a route changing pipeline
      const status = action.location && action.location.status
      action = redirect(action, status || 302)

      if (!this.tmp.committed && this.revertPop) {
        console.log('CREAT_REQUEST - revertPop')
        this.revertPop()
      }
    }

    if ((action === null || !action.type) && typeof action !== 'function') {
      action = createAction(action, this)       // automatically turn payload-only actions into real actions with routeType_COMPLETE as type
    }

    const oldUrl = this.getLocation().url

    return Promise.resolve(dispatch(action))    // dispatch transformed action
      .then(res => {
        if (oldUrl !== this.getLocation().url || this.ctx.serverRedirect) {
          this.redirect = res                    // // assign action to `this.redirect` so `compose` can properly short-circuit route redirected from and resolve to the new action (NOTE: will capture nested pathlessRoutes + anonymousThunks)
        }

        if (res && typeof res === 'object') {
          res._dispatched = true // tell `middleware/call/index.js` to not automatically dispatch callback returns
        }

        return res
      })
  }

  confirm = (canLeave = true) => {
    delete this.ctx.confirm

    if (!canLeave) {
      return this.store.dispatch({ type: UNBLOCK })
    }

    // When `false` is returned from a `call` middleware, you can use `req.confirm()`
    // to run the action successfully through the pipeline again, as in a confirmation modal.
    // All we do is temporarily delete the blocking callback and replace it after the action
    // is successfully dispatched.
    //
    // See `middleware/call/index.js` for where the below assignments are made.
    const { name, prev } = this.last
    const route = prev ? this.prevRoute : this.route
    const callback = route[name]

    delete route[name]

    return this.store.dispatch(this.action)
      .then(res => {
        route[name] = callback // put callback back
        return res
      })
  }

  block = () => {
    this.ctx.confirm = this.confirm
    const ref = createFrom(this.action)
    return this.store.dispatch({ type: BLOCK, payload: { ref } })
  }

  getKind = () => {
    return this.action.location && this.action.location.kind
  }

  hasSSR = () => {
    return this.getLocation().hasSSR
  }

  isFirstLoad = () => {
    return this.tmp.firstLoad
  }
}
