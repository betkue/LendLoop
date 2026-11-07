/**
 * App paths, without the locale prefix: pass them to the Link and router from
 * @/i18n/navigation, which add /en, /fr, /zh or /de.
 */
export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  tools: "/tools",
  category: (category: string) => `/categories/${category}`,
  search: (query: string) => `/search?q=${encodeURIComponent(query)}`,
  newTool: "/tools/new",
  tool: (id: string) => `/tools/${id}`,
  editTool: (id: string) => `/tools/${id}/edit`,
  myListings: "/my-listings",
  myRequests: "/my-requests",
  incoming: "/incoming",
  admin: "/admin",
  adminUsers: "/admin/users",
} as const;
