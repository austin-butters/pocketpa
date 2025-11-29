# File structure for "internal" data functions and types

"Internal" data functions (prefixed by "_") are those that handle application-level data validation. For example, a function _createUser may ensure inserts on the user table are valid (i.e. emailVerified cannot be true when email is null.) A _getUser function may validate the user's fields and provide additional type safety.

All internal functions should have JSDoc warnings if exported, to avoid accidental reuse.

Internal types (prefixed by "_") are data types that are not safe to return to the client. For example, a _User type contains all fields in the "user" table, while a User type would have the backupCode field removed. 

Sanitization functions should be made available before returning models to the client. For example. sanitize.user is a function of signature (_user: _User) => User.

Internal data functions have no direct connection to "Internal" types, though often used together closely.

For example, _UnvalidatedUser represents an object with all "user" fields, with no validation done. _User extends this, ensuring email and username are both present or both null, amoung other checks. A _validateUser function is considered an "Internal" function, because it handles validation required to transform _UnvalidatedUser => _User. This can then be used by a non-internal getUserFromUniqueWhereInput that allows for the same function signature as prisma.user.findUnique, but ensures fields are validated on each read. In this case, getUser (non-internal) still returns a _User (internal) object, but is not internal itself because it doesn't deal with data validation.

However, all data functions that return sensitive, not-safe-for-client types must wrap the model in an object, returning { _user } instead of _user. This enforces explicit typing of the "_" prefix by all callers (e.g. server routes), usually through destructuring, and prevents sensitive data from accidentally being returned to client.

An example:

```typescript
/**
 * INTERNAL TYPE. Contains sensitive data.
 * An unvalidated user, containing all fields in the database
 */
type _UnvalidatedUser = ReturnType<typeof prisma.user.findUniqueOrThrow>

/**
 * INTERNAL TYPE. Contains sensitive data.
 * A validated user, extends _UnvalidatedUser with additional checks
 */
type _User = _UnvalidatedUser &
// Ensure email cannot be verified if no email exists.
{ email: string } | { email: null, emailVerified: false}
// ...More checks

/**
 * INTERNAL FUNCTION. Handles application-level validation.
 * Checks if a _UnvalidatedUser is valid.
 */
const _isValidUser = (_user: _UnvalidatedUser): _user is _User => {
  // Checks...
}

/**
 * INTERNAL FUNCTION. Handles application-level validation.
 * Reads a user, ensures it is valid then returns it
 */
const _getUserFromUniqueWhereInputAndValidate = (input: Prisma.UserWhereUniqueInput) => {
  // Variable of internal type "_UnvalidatedUser" must be named with "_" prefix.
  const _user = prisma.user.findUnique({ where: input })
  if (!_isValidUser(_user)) {
    /// Validation logic...
  }
  // Return in object.
  return { _user }
}

/**
 * NOT AND INTERNAL FUNCTION. While it returns sensitive data, does not handle validation.
 * Get a user by email
 * Ensures the type is always _User rather than _UnvalidatedUser
 */
const getUserByEmail = (email: string): _User => {
  const { _user } = _getUserFromUniqueInputAndValidate({ email })
  // Other logic...
  return { _user }
}

/**
 * Some external caller. No way to access data without explicitly typing the "_" prefix.
 */
const someServerRouteHandler = (request, reply) => {
  // Preserve "_" prefix through destructuring...
  const { _user } = getUserByEmail(test@example.com)
  // _user is of type _User
  const user: User = sanitize.user(_user)
  // user is of type User
  return reply.status(200).send({ user }) // No accidental sending of sensitive data in _user.
}
```

- All internal data functions should be declared in src/data/internal/example-model
- All non-internal data functions should be declared in src/data/example-model

Types are more complicated as they include internal and non-internal types, where internal types include validatation and non-validation types.

- Interal validation types (e.g. _UnvalidatedUser) should be declared in the data/internal/example-model, as they should not be needed outside of the file. (And if they are, the internal functions aren't doing their job correctly.)
- Internal non-Validation types, whether internal or not should be declared in the internal data file, for now. Eventually they will probably be moved into a separate models folder, but for now declaring them in the internal file is better as they can be exported "upwards" rather that "downwards".
- Non-Internal types (those safe to return to client) should be declared in the current models file.

The intention is to soon move all of these data types into another file/folder structure. The hope here is that eventually this folder will act like documentation that typescript can use to find errors. It should eventually act as the original source of truth for everything else to pull from. We can't do this just yet though as we need to figure out the best models folder/file structure, so for now we're putting them in relevant files.

Where possible, do not use internal data functions directly in server routes. They are intended to be wrapped in non-internal data functions. Using internal (sensitive) types prefixed by "_" is fine.

Note: Type guard functions are sometimes currently treated as internal (i.e. _isAnonymousUser), but really they're not doing any validation, just narrowing the type, once the models are properly set up, move type guard functions here too.

# Authentication


The data structure includes:
- Anonymous Users:
  - Auth cookie
  - Backup code

- Users:
  - Auth cookie
  - Backup code
  - Email (for future logins)
  - Other fields

Potential Users can migrate to full user.
Data for both potential and full users must be stored in the same table so they can function the same.
Anonymous users can only log back in with backup code - on a different device or after cookie expiry, etc.
Anonymous users can migrate to a complete user account by adding their email.


Upon landing page, user can:
- Continue without account
- Log in to existing account

Continuing without account will:
- Create an authenticated "Anonymous user".
- Log in the user with a cookie.