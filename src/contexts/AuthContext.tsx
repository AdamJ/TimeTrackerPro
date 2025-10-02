import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
	user: User | null;
	session: Session | null;
	loading: boolean;
	signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
	signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
	signOut: () => Promise<{ error: AuthError | null }>;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Get initial session
		const getInitialSession = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);
		};

		getInitialSession();

		// Listen for auth changes
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				setSession(session);
				setUser(session?.user ?? null);
				setLoading(false);
			}
		);

		return () => subscription.unsubscribe();
	}, []);

	const signIn = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { error };
	};

	const signUp = async (email: string, password: string) => {
		const { error } = await supabase.auth.signUp({
			email,
			password,
		});
		return { error };
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		return { error };
	};

	const value = {
		user,
		session,
		loading,
		signIn,
		signUp,
		signOut,
		isAuthenticated: !!user,
	};

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};
