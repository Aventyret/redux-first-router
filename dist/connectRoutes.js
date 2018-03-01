'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.getOptions = exports.selectLocationState = exports.updateScroll = exports.scrollBehavior = exports.history = exports.nextPath = exports.prevPath = exports.canGoForward = exports.canGoBack = exports.canGo = exports.go = exports.next = exports.back = exports.replace = exports.push = undefined

var _typeof =
  typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
    ? function(obj) {
        return typeof obj
      }
    : function(obj) {
        return obj &&
        typeof Symbol === 'function' &&
        obj.constructor === Symbol &&
        obj !== Symbol.prototype
          ? 'symbol'
          : typeof obj
      }

var _pathToAction2 = require('./pure-utils/pathToAction')

var _pathToAction3 = _interopRequireDefault(_pathToAction2)

var _nestAction = require('./pure-utils/nestAction')

var _isLocationAction = require('./pure-utils/isLocationAction')

var _isLocationAction2 = _interopRequireDefault(_isLocationAction)

var _isServer = require('./pure-utils/isServer')

var _isServer2 = _interopRequireDefault(_isServer)

var _isReactNative = require('./pure-utils/isReactNative')

var _isReactNative2 = _interopRequireDefault(_isReactNative)

var _changePageTitle = require('./pure-utils/changePageTitle')

var _changePageTitle2 = _interopRequireDefault(_changePageTitle)

var _attemptCallRouteThunk = require('./pure-utils/attemptCallRouteThunk')

var _attemptCallRouteThunk2 = _interopRequireDefault(_attemptCallRouteThunk)

var _createThunk = require('./pure-utils/createThunk')

var _createThunk2 = _interopRequireDefault(_createThunk)

var _pathnamePlusSearch = require('./pure-utils/pathnamePlusSearch')

var _pathnamePlusSearch2 = _interopRequireDefault(_pathnamePlusSearch)

var _historyCreateAction = require('./action-creators/historyCreateAction')

var _historyCreateAction2 = _interopRequireDefault(_historyCreateAction)

var _middlewareCreateAction = require('./action-creators/middlewareCreateAction')

var _middlewareCreateAction2 = _interopRequireDefault(_middlewareCreateAction)

var _middlewareCreateNotFoundAction = require('./action-creators/middlewareCreateNotFoundAction')

var _middlewareCreateNotFoundAction2 = _interopRequireDefault(
  _middlewareCreateNotFoundAction
)

var _createLocationReducer = require('./reducer/createLocationReducer')

var _createLocationReducer2 = _interopRequireDefault(_createLocationReducer)

var _index = require('./index')

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}

var __DEV__ = process.env.NODE_ENV !== 'production'

/** PRIMARY EXPORT - `connectRoutes(history, routeMap, options)`:
 *
 *  PURPOSE: to provide set-it-forget-it syncing of actions to the address bar and vice
 *  versa, using the pairing of action types to express-style routePaths bi-directionally.
 *
 *  EXAMPLE:
 *  with routeMap `{ FOO: '/foo/:paramName' }`,
 *
 *  pathname '/foo/bar' would become:
 *  `{ type: 'FOO', payload: { paramName: 'bar' } }`
 *
 *  AND
 *
 *  action `{ type: 'FOO', payload: { paramName: 'bar' } }`
 *  becomes: pathname '/foo/bar'
 *
 *
 *  HOW: Firstly, the middleware listens to received actions and then converts them to the
 *  pathnames it applies to the address bar (via `history.push({ pathname })`. It also formats
 *  the action to be location-aware, primarily by including a matching pathname, which the
 *  location reducer listens to, and which user reducers can also make use of.
 *
 *  However, user reducers typically only need to  be concerned with the type
 *  and payload like they are accustomed to. That's the whole purpose of this package.
 *  The idea is by matching action types to routePaths, it's set it and forget it!
 *
 *  Secondly, a history listener listens to URL changes and dispatches actions with
 *  types and payloads that match the pathname. Hurray! Browse back/next buttons now work!
 *
 *  Both the history listener and middleware are made to not get into each other's way, i.e.
 *  avoiding double dispatching and double address bar changes.
 *
 *
 *  VERY IMPORTANT NOTE ON SSR: if you're wondering, `connectRoutes()` when called returns
 *  functions in a closure that provide access to variables in a private
 *  "per instance" fashion in order to be used in SSR without leaking
 *  state between SSR requests :).
 *
 *  As much as possible has been refactored out of this file into pure or
 *  near-pure utility functions.
*/

exports.default = function(history) {
  var routesMap =
    arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {}
  var options =
    arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {}

  if (__DEV__) {
    if (!history) {
      throw new Error(
        "[redux-first-router] invalid `history` agument. Using the 'history' package on NPM,\n        please provide a `history` object as a second parameter. The object will be the\n        return of createBrowserHistory() (or in React Native or Node: createMemoryHistory()).\n        See: https://github.com/mjackson/history"
      )
    }

    if (options.restoreScroll && typeof options.restoreScroll !== 'function') {
      throw new Error(
        '[redux-first-router] invalid `restoreScroll` option. Using\n        https://github.com/faceyspacey/redux-first-router-restore-scroll\n        please call `restoreScroll` and assign it the option key\n        of the same name.'
      )
    }
  }

  /** INTERNAL ENCLOSED STATE (PER INSTANCE FOR SSR!) */

  // very important: used for comparison to determine address bar changes
  var currentPath = (0, _pathnamePlusSearch2.default)(history.location)

  var prevLocation = {
    // maintains previous location state in location reducer
    pathname: '',
    type: '',
    payload: {}
  }

  var _options$notFoundPath = options.notFoundPath,
    notFoundPath =
      _options$notFoundPath === undefined
        ? '/not-found'
        : _options$notFoundPath,
    _options$scrollTop = options.scrollTop,
    scrollTop = _options$scrollTop === undefined ? false : _options$scrollTop,
    location = options.location,
    title = options.title,
    onBeforeChange = options.onBeforeChange,
    onAfterChange = options.onAfterChange,
    onBackNext = options.onBackNext,
    restoreScroll = options.restoreScroll,
    _options$initialDispa = options.initialDispatch,
    shouldPerformInitialDispatch =
      _options$initialDispa === undefined ? true : _options$initialDispa,
    querySerializer = options.querySerializer

  var selectLocationState =
    typeof location === 'function'
      ? location
      : location
        ? function(state) {
            return state[location]
          }
        : function(state) {
            return state.location
          }

  var selectTitleState =
    typeof title === 'function'
      ? title
      : title
        ? function(state) {
            return state[title]
          }
        : function(state) {
            return state.title
          }

  var scrollBehavior = restoreScroll && restoreScroll(history)

  var _pathToAction = (0, _pathToAction3.default)(currentPath, routesMap),
    type = _pathToAction.type,
    payload = _pathToAction.payload,
    meta = _pathToAction.meta

  var INITIAL_LOCATION_STATE = (0, _createLocationReducer.getInitialState)(
    currentPath,
    meta,
    type,
    payload,
    routesMap,
    history
  )

  var prevState = INITIAL_LOCATION_STATE // used only to pass  as 1st arg to `scrollBehavior.updateScroll` if used
  var nextState = {} // used as 2nd arg to `scrollBehavior.updateScroll` and to change `document.title`
  var prevLength = 1 // used by `historyCreateAction` to calculate if moving along history.entries track

  var reducer = (0, _createLocationReducer2.default)(
    INITIAL_LOCATION_STATE,
    routesMap
  )
  var thunk = (0, _createThunk2.default)(routesMap, selectLocationState)
  var initialDispatch = function initialDispatch() {
    return _initialDispatch && _initialDispatch()
  }

  var windowDocument = (0, _changePageTitle.getDocument)() // get plain object for window.document if server side

  var navigators = void 0
  var patchNavigators = void 0
  var actionToNavigation = void 0
  var navigationToAction = void 0

  if (options.navigators) {
    // redux-first-router-navigation reformats the `navigators` option
    // to have the navigators nested one depth deeper, so as to include
    // the various helper functions from its package
    if (__DEV__ && !options.navigators.navigators) {
      throw new Error(
        "[redux-first-router] invalid `navigators` option. Pass your map\n        of navigators to the default import from 'redux-first-router-navigation'.\n        Don't forget: the keys are your redux state keys."
      )
    }

    navigators = options.navigators.navigators
    patchNavigators = options.navigators.patchNavigators
    actionToNavigation = options.navigators.actionToNavigation
    navigationToAction = options.navigators.navigationToAction

    patchNavigators(navigators)
  }

  /** MIDDLEWARE
   *  1)  dispatches actions with location info in the `meta` key by matching the received action
   *      type + payload to express style routePaths (which also results in location reducer state updating)
   *  2)  changes the address bar url and page title if the currentPathName changes, while
   *      avoiding collisions with simultaneous browser history changes
  */

  var middleware = function middleware(store) {
    return function(next) {
      return function(action) {
        var navigationAction = void 0

        if (navigators && action.type.indexOf('Navigation/') === 0) {
          var _navigationToAction = navigationToAction(
            navigators,
            store,
            routesMap,
            action
          )

          navigationAction = _navigationToAction.navigationAction
          action = _navigationToAction.action
        }

        var route = routesMap[action.type]

        if (action.error && (0, _isLocationAction2.default)(action)) {
          if (__DEV__) {
            console.warn(
              'redux-first-router: location update did not dispatch as your action has an error.'
            )
          }
        } else if (
          action.type === _index.NOT_FOUND &&
          !(0, _isLocationAction2.default)(action)
        ) {
          // user decided to dispatch `NOT_FOUND`, so we fill in the missing location info
          action = (0, _middlewareCreateNotFoundAction2.default)(
            action,
            selectLocationState(store.getState()),
            prevLocation,
            history,
            notFoundPath
          )
        } else if (route && !(0, _isLocationAction2.default)(action)) {
          // THE MAGIC: dispatched action matches a connected type, so we generate a
          // location-aware action and also as a result update location reducer state.
          action = (0, _middlewareCreateAction2.default)(
            action,
            routesMap,
            prevLocation,
            history,
            notFoundPath,
            querySerializer
          )
        }

        if (navigators) {
          action = actionToNavigation(
            navigators,
            action,
            navigationAction,
            route
          )
        }

        // DISPATCH LIFECYLE:
        var skip = void 0
        if ((route || action.type === _index.NOT_FOUND) && action.meta) {
          // satisify flow with `action.meta` check
          skip = _beforeRouteChange(_store, history, action)
        }

        if (skip) return
        var nextAction = next(action) // DISPATCH

        if (route || action.type === _index.NOT_FOUND) {
          _afterRouteChange(_store, route)
        }

        return nextAction
      }
    }
  }

  var _beforeRouteChange = function _beforeRouteChange(store, history, action) {
    var location = action.meta.location

    if (onBeforeChange) {
      var skip = void 0

      var dispatch = function dispatch(action) {
        if (
          action &&
          action.meta &&
          action.meta.location &&
          action.meta.location.kind === 'redirect'
        ) {
          skip = true
          prevLocation = location.current
          var _nextPath = (0, _pathnamePlusSearch2.default)(location.current)
          var isHistoryChange = _nextPath === currentPath

          // In this unique scenario, the action won't in fact be treated as a
          // redirect since the initial action is never dispatched. If it is
          // an action resulting from pressing the browser buttons, it will
          // do a replace just like a redirect is meant to, since the location
          // change is unavoidable and happens before the middleware. On the
          // server, a redirect is always dispatched since its needed to detect
          // whether to call `res.redirect`. In that case history is irrelevant.
          if (!isHistoryChange && !(0, _isServer2.default)()) {
            history.push(_nextPath) // this will be replaced since it's a redirect
          }
        }

        store.dispatch(action)
      }

      onBeforeChange(dispatch, store.getState, action)
      if (skip) return true
    }

    prevState = selectLocationState(store.getState())
    prevLocation = location.current
    prevLength = history.length

    // addressbar updated before action dispatched like in history.listener
    _middlewareAttemptChangeUrl(location, history)

    // now we can finally set the history on the action since we get its
    // value from the `history` whose value only changes after `push()`
    if ((0, _isReactNative2.default)()) {
      location.history = (0, _nestAction.nestHistory)(history)
    }
  }

  var _afterRouteChange = function _afterRouteChange(store, route) {
    var dispatch = store.dispatch
    var state = store.getState()
    var kind = selectLocationState(state).kind
    var title = selectTitleState(state)
    nextState = selectLocationState(state)

    if (
      (typeof route === 'undefined' ? 'undefined' : _typeof(route)) === 'object'
    ) {
      ;(0, _attemptCallRouteThunk2.default)(
        dispatch,
        store.getState,
        route,
        selectLocationState
      )
    }

    if (onAfterChange) {
      onAfterChange(dispatch, store.getState)
    }

    if (typeof window !== 'undefined' && kind) {
      if (typeof onBackNext === 'function' && /back|next|pop/.test(kind)) {
        onBackNext(dispatch, store.getState)
      }

      setTimeout(function() {
        ;(0, _changePageTitle2.default)(windowDocument, title)

        if (scrollTop) {
          return window.scrollTo(0, 0)
        }

        _updateScroll(false)
      })
    }
  }

  var _middlewareAttemptChangeUrl = function _middlewareAttemptChangeUrl(
    location,
    history
  ) {
    // IMPORTANT: insure history hasn't already handled location change
    var nextPath = (0, _pathnamePlusSearch2.default)(location.current)
    if (nextPath !== currentPath) {
      // keep currentPath up to date for comparison to prevent double dispatches
      // between BROWSER back/forward button usage vs middleware-generated actions
      currentPath = nextPath // IMPORTANT: must happen before history.push() (to prevent double handling)

      // for React Native, in the case `back` or `next` is
      // not called directly, `middlewareCreateAction` may emulate
      // `history` backNext actions to support features such
      // as scroll restoration. In those cases, we need to prevent
      // pushing new routes on to the entries array. `stealth` is
      // a React Navigation feature for changing StackNavigators
      // without triggering other navigators (such as a TabNavigator)
      // to change as well. It allows you to reset hidden StackNavigators.
      var kind = location.kind
      var manuallyInvoked = kind && /back|next|pop|stealth/.test(kind)

      if (!manuallyInvoked) {
        var method = kind === 'redirect' ? 'replace' : 'push'
        history[method](currentPath) // change address bar corresponding to matched actions from middleware
      }
    }
  }

  /** ENHANCER
   *  1)  dispatches actions with types and payload extracted from the URL pattern
   *      when the browser history changes
   *  2)  on load of the app dispatches an action corresponding to the initial url
   */

  var enhancer = function enhancer(createStore) {
    return function(reducer, preloadedState, enhancer) {
      // routesMap stored in location reducer will be stringified as it goes from the server to client
      // and as a result functions in route objects will be removed--here's how we insure we bring them back
      if (
        typeof window !== 'undefined' &&
        preloadedState &&
        selectLocationState(preloadedState)
      ) {
        selectLocationState(preloadedState).routesMap = routesMap
      }

      var store = createStore(reducer, preloadedState, enhancer)
      var state = store.getState()
      var location = state && selectLocationState(state)

      // assign to outer closure so middleware can access full middleware
      // pipeline when dispatching additional actions in onBefore/AfterChange
      _store = store

      if (!location || !location.pathname) {
        throw new Error(
          '[redux-first-router] you must provide the key of the location\n        reducer state and properly assigned the location reducer to that key.'
        )
      }

      history.listen(_historyAttemptDispatchAction.bind(null, store))

      // dispatch the first location-aware action so initial app state is based on the url on load
      if (!location.hasSSR || (0, _isServer2.default)()) {
        // only dispatch on client before SSR is setup, which passes state on to the client
        _initialDispatch = function _initialDispatch() {
          var action = (0, _historyCreateAction2.default)(
            currentPath,
            routesMap,
            prevLocation,
            history,
            'load',
            querySerializer
          )

          store.dispatch(action)
        }

        if (shouldPerformInitialDispatch !== false) {
          _initialDispatch()
        }
      } else {
        // set correct prevLocation on client that has SSR so that it will be
        // assigned to `action.meta.location.prev` and the corresponding state
        prevLocation = location
      }

      // update the scroll position after initial rendering of page
      if (typeof window !== 'undefined')
        setTimeout(function() {
          return _updateScroll(false)
        })

      return store
    }
  }

  var _historyAttemptDispatchAction = function _historyAttemptDispatchAction(
    store,
    location,
    historyAction
  ) {
    // IMPORTANT: insure middleware hasn't already handled location change:
    var nextPath = (0, _pathnamePlusSearch2.default)(location)

    if (nextPath !== currentPath) {
      // THE MAGIC: parse the address bar path into a matched action
      var kind = historyAction === 'REPLACE' ? 'redirect' : historyAction

      var action = (0, _historyCreateAction2.default)(
        nextPath,
        routesMap,
        prevLocation,
        history,
        kind.toLowerCase(),
        querySerializer,
        currentPath,
        prevLength
      )

      currentPath = nextPath // IMPORTANT: must happen before dispatch (to prevent double handling)

      store.dispatch(action) // dispatch route type + payload corresponding to browser back/forward usage
    }
  }

  /* SIDE_EFFECTS - client-only state that must escape closure */

  _history = history
  _scrollBehavior = scrollBehavior
  _selectLocationState = selectLocationState
  _options = options
  var _initialDispatch = void 0

  _updateScroll = function _updateScroll() {
    var performedByUser =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true

    if (scrollBehavior) {
      if (!scrollBehavior.manual) {
        scrollBehavior.updateScroll(prevState, nextState)
      }
    } else if (__DEV__ && performedByUser) {
      throw new Error(
        '[redux-first-router] you must set the `restoreScroll` option before\n        you can call `updateScroll`'
      )
    }
  }

  /* RETURN  */

  return {
    reducer: reducer,
    middleware: middleware,
    enhancer: enhancer,
    thunk: thunk,
    initialDispatch: initialDispatch,

    // returned only for tests (not for use in application code)
    _middlewareAttemptChangeUrl: _middlewareAttemptChangeUrl,
    _afterRouteChange: _afterRouteChange,
    _historyAttemptDispatchAction: _historyAttemptDispatchAction,
    windowDocument: windowDocument,
    history: history
  }
}

/** SIDE EFFECTS:
 *  Client code needs a simple `push`,`back` + `next` functions because it's convenient for
 *  prototyping. It will not harm SSR, so long as you don't use it server side. So if you use it, that means DO NOT
 *  simulate clicking links server side--and dont do that, dispatch actions to setup state instead.
 *
 *  THE IDIOMATIC WAY: instead use https://github.com/faceyspacey/redux-first-router-link 's `<Link />`
 *  component to generate SEO friendly urls. As its `href` prop, you pass it a path, array of path
 *  segments or action, and internally it will use `connectRoutes` to change the address bar and
 *  dispatch the correct final action from middleware.
 *
 *  NOTE ON BACK FUNCTIONALITY: The better way to accomplish a back button is to use your redux state to determine
 *  the previous URL. The location reducer will also contain relevant info. But if you must,
 *  this is here for convenience and it basically simulates the user pressing the browser
 *  back button, which of course the system picks up and parses into an action.
 */

var _history = void 0
var _scrollBehavior = void 0
var _updateScroll = void 0
var _selectLocationState = void 0
var _options = void 0
var _store = void 0

var push = (exports.push = function push(pathname) {
  return _history.push(pathname)
})

var replace = (exports.replace = function replace(pathname) {
  return _history.replace(pathname)
})

var back = (exports.back = function back() {
  return _history.goBack()
})

var next = (exports.next = function next() {
  return _history.goForward()
})

var go = (exports.go = function go(n) {
  return _history.go(n)
})

var canGo = (exports.canGo = function canGo(n) {
  return _history.canGo(n)
})

var canGoBack = (exports.canGoBack = function canGoBack() {
  return !!_history.entries[_history.index - 1]
})

var canGoForward = (exports.canGoForward = function canGoForward() {
  return !!_history.entries[_history.index + 1]
})

var prevPath = (exports.prevPath = function prevPath() {
  var entry = _history.entries[_history.index - 1]
  return entry && entry.pathname
})

var nextPath = (exports.nextPath = function nextPath() {
  var entry = _history.entries[_history.index + 1]
  return entry && entry.pathname
})

var history = (exports.history = function history() {
  return _history
})

var scrollBehavior = (exports.scrollBehavior = function scrollBehavior() {
  return _scrollBehavior
})

var updateScroll = (exports.updateScroll = function updateScroll() {
  return _updateScroll && _updateScroll()
})

var selectLocationState = (exports.selectLocationState = function selectLocationState(
  state
) {
  return _selectLocationState(state)
})

var getOptions = (exports.getOptions = function getOptions() {
  return _options
})
