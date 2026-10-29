import { query, execute } from "@/lib/db"

export interface UserProfileData {
  full_name?: string
  email?: string
  phone?: string
  address?: string
  company?: string
  date_of_birth?: string
  username_preference?: string
  bio?: string
}

export async function getUserProfile(userId: string | null): Promise<UserProfileData | null> {
  try {
    let rows: any[] = []
    if (userId) {
      rows = await query("SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1", [userId])
    }
    if (rows.length === 0) {
      // Fallback to default demo profile
      rows = await query("SELECT * FROM user_profiles WHERE id = 'default_profile' LIMIT 1")
    }

    if (rows.length > 0) {
      const r = rows[0]
      return {
        full_name: r.full_name || undefined,
        email: r.email || undefined,
        phone: r.phone || undefined,
        address: r.address || undefined,
        company: r.company || undefined,
        date_of_birth: r.date_of_birth || undefined,
        username_preference: r.username_preference || undefined,
        bio: r.bio || undefined,
      }
    }
  } catch (e) {
    console.error("Error retrieving user profile:", e)
  }

  return {
    full_name: "Jane Doe",
    email: "janedoe.test@example.com",
    phone: "+1-555-0199",
    address: "123 Tech Avenue, Silicon Valley, CA",
    company: "NoBrain AI",
    username_preference: "janedoe99",
  }
}

export async function updateUserProfile(userId: string | null, data: UserProfileData): Promise<void> {
  const profileId = userId || "default_profile"
  await execute(
    `INSERT INTO user_profiles (id, user_id, full_name, email, phone, address, company, username_preference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       email = VALUES(email),
       phone = VALUES(phone),
       address = VALUES(address),
       company = VALUES(company),
       username_preference = VALUES(username_preference)`,
    [
      profileId,
      userId,
      data.full_name || null,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.company || null,
      data.username_preference || null,
    ]
  )
}

