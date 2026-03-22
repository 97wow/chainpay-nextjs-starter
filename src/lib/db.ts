// In-memory store for demo purposes.
// Replace with your database: Prisma + PostgreSQL, Drizzle + SQLite, etc.
//
// Example with Prisma:
//   npx prisma init
//   Define User model in prisma/schema.prisma
//   Use prisma.user.create(), prisma.user.findUnique(), prisma.user.update()

interface User {
  id: string
  email: string
  passwordHash: string
  subscriptionStatus: 'free' | 'pro'
  subscriptionExpiresAt: Date | null
}

const users = new Map<string, User>()
const usersByEmail = new Map<string, User>()

export const db = {
  users: {
    create(user: User) {
      users.set(user.id, user)
      usersByEmail.set(user.email, user)
      return user
    },
    findById(id: string) {
      return users.get(id) || null
    },
    findByEmail(email: string) {
      return usersByEmail.get(email) || null
    },
    update(id: string, patch: Partial<User>) {
      const u = users.get(id)
      if (!u) return null
      Object.assign(u, patch)
      return u
    },
  },
}
