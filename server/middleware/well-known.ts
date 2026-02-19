// Server middleware to handle .well-known routes
// Returns 204 No Content for Chrome DevTools and other .well-known requests
// This prevents Vue Router warnings for paths it doesn't handle

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  
  // Handle all .well-known requests
  if (url.pathname.startsWith('/.well-known/')) {
    // Return 204 No Content - the request is acknowledged but no data provided
    event.node.res.statusCode = 204
    event.node.res.end()
    return
  }
})
