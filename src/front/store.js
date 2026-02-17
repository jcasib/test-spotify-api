export const initialStore = () => {
  return {
    // Auth
    token: localStorage.getItem("token") || null,
    user: JSON.parse(localStorage.getItem("user") || "null"),
    // Peticiones del usuario actual
    myRequests: [],
    // Resultados de búsqueda
    searchResults: [],
    // Cola pública (pantalla del pub)
    publicQueue: [],
    // Panel moderador
    pendingRequests: [],
  }
}

export default function storeReducer(store, action = {}) {
  switch (action.type) {

    case "set_auth":
      localStorage.setItem("token", action.payload.token)
      localStorage.setItem("user", JSON.stringify(action.payload.user))
      return { ...store, token: action.payload.token, user: action.payload.user }

    case "logout":
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      return { ...store, token: null, user: null, myRequests: [], searchResults: [] }

    case "set_search_results":
      return { ...store, searchResults: action.payload }

    case "set_my_requests":
      return { ...store, myRequests: action.payload }

    case "add_my_request":
      return { ...store, myRequests: [action.payload, ...store.myRequests] }

    case "update_my_request":
      return {
        ...store,
        myRequests: store.myRequests.map(r =>
          r.id === action.payload.id ? action.payload : r
        )
      }

    case "set_public_queue":
      return { ...store, publicQueue: action.payload }

    case "add_to_public_queue":
      return { ...store, publicQueue: [action.payload, ...store.publicQueue].slice(0, 15) }

    case "set_pending_requests":
      return { ...store, pendingRequests: action.payload }

    case "add_pending_request":
      return { ...store, pendingRequests: [...store.pendingRequests, action.payload] }

    case "remove_pending_request":
      return { ...store, pendingRequests: store.pendingRequests.filter(r => r.id !== action.payload) }

    default:
      throw Error("Unknown action: " + action.type)
  }
}