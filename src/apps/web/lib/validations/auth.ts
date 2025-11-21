import type {  NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/validations/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from './passwordhelpers';

export const authOptions: NextAuthOptions= {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
    try {
      if (!credentials?.email || !credentials?.password) return null;
      const email = String(credentials.email);
      const password = String(credentials.password);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || typeof user.password !== 'string') return null;
      const ok = await verifyPassword(password, user.password);
      if (!ok) return null;
      return { id: user.id, name: user.name ?? undefined, email: user.email };
    } catch (err) {
      console.error('authorize error:', err); // log to dev terminal
      throw err; // let NextAuth handle/re-throw for visibility
    }
  },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
};

// export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
