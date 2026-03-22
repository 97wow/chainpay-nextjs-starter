import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (db.users.findByEmail(email)) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const user = db.users.create({
    id: nanoid(),
    email,
    passwordHash: await bcrypt.hash(password, 10),
    subscriptionStatus: 'free',
    subscriptionExpiresAt: null,
  })

  const token = signToken({ userId: user.id, email: user.email })
  return NextResponse.json({ token }, { status: 201 })
}
