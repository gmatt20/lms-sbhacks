// Users are now managed by Clerk, not MongoDB
// User data (email, name, role) is stored in Clerk's publicMetadata
// Reference users in other schemas using their Clerk user ID (string)

// Example Clerk user structure:
// {
//   id: "user_2abc123",  // Clerk user ID
//   email: "teacher@example.com",
//   firstName: "Sarah",
//   lastName: "Chen",
//   publicMetadata: {
//     role: "teacher"  // or "student" or "admin"
//   }
// }

// See src/utils/roles.ts for helper functions to check user roles
// See src/app/actions/user.ts for server actions to manage user metadata
