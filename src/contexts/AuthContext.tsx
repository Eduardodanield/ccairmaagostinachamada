import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isDirector: boolean;
  isTeacher: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    console.log('[Auth] Fetching user data for:', userId);
    try {
      // Fetch profile and role in parallel (role may not exist yet)
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      console.log('[Auth] Profile result:', profileResult);
      console.log('[Auth] Role result:', roleResult);

      // Handle errors gracefully - don't throw, just log and set null
      if (profileResult.error) {
        console.error('[Auth] Profile fetch error:', profileResult.error);
      }
      if (roleResult.error) {
        console.error('[Auth] Role fetch error:', roleResult.error);
      }

      setProfile((profileResult.data as Profile | null) ?? null);
      setRole((roleResult.data?.role as AppRole | null) ?? null);
    } catch (error) {
      console.error('[Auth] Error fetching user data:', error);
      // Ensure we set null values on error
      setProfile(null);
      setRole(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    console.log('[Auth] Initializing auth context...');

    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, session?.user?.email);
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            await fetchUserData(session.user.id);
          } catch (error) {
            console.error('[Auth] Error in onAuthStateChange fetchUserData:', error);
          }
        } else {
          setProfile(null);
          setRole(null);
        }
        
        if (isMounted) {
          console.log('[Auth] Setting isLoading to false (from onAuthStateChange)');
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      console.log('[Auth] Getting existing session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
        }
        
        console.log('[Auth] Existing session:', session?.user?.email ?? 'none');
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            await fetchUserData(session.user.id);
          } catch (error) {
            console.error('[Auth] Error fetching user data:', error);
          }
        }
      } catch (error) {
        console.error('[Auth] Critical error in initializeAuth:', error);
      } finally {
        if (isMounted) {
          console.log('[Auth] Setting isLoading to false (from initializeAuth)');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isLoading,
    isDirector: role === 'director',
    isTeacher: role === 'teacher',
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
