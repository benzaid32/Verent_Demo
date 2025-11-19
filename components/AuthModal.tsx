
import React, { useState } from 'react';
import { Hexagon, Mail, ArrowRight, Loader2 } from 'lucide-react';

interface AuthModalProps {
  onLogin: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      if (step === 'email') {
        setStep('code');
      } else {
        onLogin();
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[400px] rounded-2xl shadow-2xl p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-verent-green flex items-center justify-center mb-4 shadow-lg shadow-verent-green/30">
                <Hexagon className="w-7 h-7 text-white fill-current" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to Verent</h2>
            <p className="text-sm text-gray-500 mt-2 text-center">
              {step === 'email' ? 'Sign in or create an embedded wallet to start renting infrastructure.' : 'Enter the 6-digit code sent to your email.'}
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 'email' ? (
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 ml-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all"
                        placeholder="name@company.com"
                    />
                </div>
            </div>
          ) : (
             <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 ml-1">Verification Code</label>
                <input 
                    type="text" 
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#111] text-white font-medium py-3 rounded-xl hover:bg-black transition-all disabled:opacity-70 flex items-center justify-center space-x-2 shadow-lg shadow-gray-200"
          >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    <span>{step === 'email' ? 'Continue with Email' : 'Verify & Login'}</span>
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <p className="text-[10px] text-gray-400">
                By continuing, you agree to our Terms of Service and Privacy Policy.
                <br/>Secured by <span className="font-semibold text-gray-500">Privy</span>
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
