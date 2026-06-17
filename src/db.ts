// src/db.ts
import { supabase } from './supabaseClient'; // Import the Supabase client

// Define the array of image identifiers for avatar URLs
const avatarImageIdentifiers = [
  '1535713875002-d1d0cf377fde',
  '1494790108377-be9c29b29330',
  '1507003211169-0a1dd7228f2d',
  '1544005313-94ddf0286df2',
  '1438761681033-6461ffad8d80',
  '1500648767791-00dcc994a43e',
  '1534528741775-53994a69daeb',
  '1573496359142-b8d87734a5a2'
];

// Function to get a random avatar URL
function getRandomAvatarUrl(): string {
  const randomIndex = Math.floor(Math.random() * avatarImageIdentifiers.length);
  const randomIdentifier = avatarImageIdentifiers[randomIndex];
  return `https://images.unsplash.com/photo-${randomIdentifier}?auto=format&fit=crop&q=80&w=150`;
}

// Modified createUser function to use Supabase Auth and Database
export async function createUser(name: string, email: string, password: string, role: string = "Contributor"): Promise<any | null> {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          role: role,
          avatarUrl: getRandomAvatarUrl() // Use the helper function
        }
      }
    });

    if (authError) {
      console.error('Supabase Auth Error:', authError.message);
      // Handle specific errors, e.g., email already exists
      if (authError.message.includes('already registered')) {
        // Try to find the existing user if they are already registered
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return existingUser;
        }
      }
      throw authError; // Re-throw the error if not handled specifically
    }

    // If user creation in Auth is successful, insert user details into the 'users' table
    // Note: Supabase Auth automatically creates a record in `auth.users`.
    // We are inserting into our custom `users` table to store additional profile info.
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user?.id, // Use the id from Supabase Auth
          name: name,
          email: email,
          role: role,
          avatarUrl: authData.user?.user_metadata?.avatarUrl // Use avatarUrl from auth metadata
        }
      ])
      .select(); // select() returns the inserted rows

    if (profileError) {
      console.error('Supabase Profile Error:', profileError.message);
      // It's possible the user was created in auth but failed in the custom table.
      // You might want to handle this more robustly (e.g., attempt to delete the auth user or flag for review).
      throw profileError;
    }

    // Return the created user profile data from the 'users' table
    return userProfile ? userProfile[0] : null;

  } catch (error: any) {
    console.error('Error creating user:', error.message);
    return null;
  }
}

// Modified findUserByEmail function to use Supabase
export async function findUserByEmail(email: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) {
      return data[0];
    }
    return null;
  } catch (error: any) {
    console.error('Error finding user by email:', error.message);
    return null;
  }
}

// Modified findUserById function to use Supabase
export async function findUserById(id: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) {
      return data[0];
    }
    return null;
  } catch (error: any) {
    console.error('Error finding user by id:', error.message);
    return null;
  }
}

// Removed sql.js specific functions: getDb, generateId, saveDb
// These are no longer needed as Supabase handles database operations and authentication.