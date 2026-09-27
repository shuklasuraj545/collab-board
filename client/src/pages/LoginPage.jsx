import React from 'react';
import LoginForm from '../components/auth/LoginForm';
import { Layout } from 'lucide-react';

export const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex flex-col justify-center items-center p-4">
      <div className="flex items-center space-x-2 text-brand-600 font-bold text-3xl mb-8">
        <Layout className="w-8 h-8 text-brand-500" />
        <span>CollabBoard</span>
      </div>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
