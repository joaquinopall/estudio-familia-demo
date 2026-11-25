/**
 * Ids shared by the login form (client) and the part of the page that depends on the request
 * (server). In their own module: a value exported from a "use client" file reaches a Server
 * Component as a client reference, not as the string.
 */

/** The `next` hidden field lives outside the form and joins it with form="login-form". */
export const LOGIN_FORM_ID = "login-form";
