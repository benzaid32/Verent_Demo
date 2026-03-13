
import React, { useState, useEffect } from 'react';
import { Listing, BookingStep, Rental } from '../types';
import { ShieldCheck, CheckCircle2, Loader2, FileText, Lock, ArrowRight, X, Fingerprint } from 'lucide-react';

interface BookingModalProps {
  listing: Listing;
  days: number;
  rentalTotal: number;
  collateralAmount: number;
  onClose: () => void;
  onConfirm: () => Promise<Rental>;
  onDone: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ listing, days, rentalTotal, collateralAmount, onClose, onConfirm, onDone }) => {
  const [step, setStep] = useState<BookingStep>('summary');
  const [progress, setProgress] = useState(0);
  const [createdRental, setCreatedRental] = useState<Rental | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const totalRequired = rentalTotal + collateralAmount;
  const protocolFee = Math.max(0, rentalTotal - (listing.dailyRateUsdc * days));

  useEffect(() => {
    if (step === 'contract_check') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep('signature');
            return 100;
          }
          return prev + 2;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleSign = async () => {
    setBookingError(null);
    setStep('processing');
    try {
      const rental = await onConfirm();
      setCreatedRental(rental);
      setStep('confirmed');
    } catch (caughtError) {
      setBookingError(caughtError instanceof Error ? caughtError.message : 'Failed to create escrow rental.');
      setStep('signature');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-black flex items-center justify-center">
                <Lock className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Secure Checkout</span>
          </div>
          {step !== 'processing' && step !== 'confirmed' && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            {/* STEP 1: SUMMARY */}
            {step === 'summary' && (
                <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                        <img src={listing.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover bg-gray-100 shadow-sm" />
                        <div>
                            <h3 className="font-bold text-gray-900 line-clamp-1">{listing.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{listing.location}</p>
                            <div className="flex items-center space-x-1 text-xs text-green-600 mt-2 bg-green-50 px-2 py-0.5 rounded w-fit">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verified Asset</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Rate</span>
                            <span className="font-mono text-gray-900">${listing.dailyRateUsdc.toFixed(2)} / day</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Duration</span>
                            <span className="font-mono text-gray-900">{days} Days</span>
                        </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Protocol Fee</span>
                            <span className="font-mono text-gray-900">${protocolFee.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between text-sm font-medium text-blue-600">
                            <span className="">Collateral (Refundable)</span>
                            <span className="font-mono">${collateralAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                            <span className="font-bold text-gray-900">Total Lock</span>
                            <span className="text-xl font-bold font-mono text-gray-900">${totalRequired.toFixed(2)} <span className="text-xs font-normal text-gray-400">USDC</span></span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setStep('contract_check')}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 flex items-center justify-center space-x-2 group"
                    >
                        <span>Initiate Contract</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* STEP 2: SMART CONTRACT GENERATION */}
            {step === 'contract_check' && (
                <div className="text-center py-8 space-y-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto relative">
                        <FileText className="w-8 h-8 text-gray-400" />
                        <div className="absolute inset-0 border-2 border-verent-green rounded-full opacity-20 animate-ping"></div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Generating Escrow Contract</h3>
                        <p className="text-sm text-gray-500 mt-2">Verifying asset availability and drafting terms on Solana.</p>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                            className="h-full bg-verent-green transition-all duration-75 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    
                    <div className="text-xs text-gray-400 font-mono">
                        {progress < 30 ? 'Initializing...' : progress < 70 ? 'Hashing Asset ID...' : 'Finalizing Terms...'}
                    </div>
                </div>
            )}

            {/* STEP 3: SIGNATURE */}
            {step === 'signature' && (
                <div className="space-y-6">
                     <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Smart Contract Interaction</span>
                            <span className="text-[10px] font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">Devnet</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Function</span>
                                <span className="font-mono text-blue-600">initialize_rental_escrow</span>
                            </div>
                             <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Asset ID</span>
                                <span className="font-mono text-gray-900">{listing.id}</span>
                            </div>
                             <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Collateral Lock</span>
                                <span className="font-mono text-gray-900">{collateralAmount.toFixed(2)} USDC</span>
                            </div>
                        </div>
                     </div>

                     <button 
                        onClick={() => void handleSign()}
                        className="w-full bg-verent-green text-white py-4 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-verent-green/20 flex items-center justify-center space-x-3"
                    >
                        <Fingerprint className="w-5 h-5" />
                        <span>Sign & Approve Transaction</span>
                    </button>
                    <p className="text-xs text-center text-gray-400">
                        Your wallet will ask you to approve this request.
                    </p>
                    {bookingError && (
                        <p className="text-xs text-center text-red-500">{bookingError}</p>
                    )}
                </div>
            )}

             {/* STEP 4: PROCESSING */}
             {step === 'processing' && (
                <div className="text-center py-12 space-y-6">
                     <Loader2 className="w-12 h-12 text-verent-green animate-spin mx-auto" />
                     <div>
                        <h3 className="text-lg font-bold text-gray-900">Confirming on Chain</h3>
                        <p className="text-sm text-gray-500 mt-2">Waiting for block confirmation...</p>
                    </div>
                    <div className="flex justify-center space-x-2">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0s'}}></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            )}

            {/* STEP 5: CONFIRMED */}
            {step === 'confirmed' && (
                <div className="text-center space-y-6 py-4">
                     <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Rental Confirmed!</h3>
                        <p className="text-sm text-gray-500 mt-2">Funds are securely locked in escrow.</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-left">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pickup Instructions</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            A QR code has been generated in your Dashboard. Present this to the owner ({listing.ownerName}) upon pickup to release the asset.
                        </p>
                    </div>

                    {createdRental?.rentalEscrowPda && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-left space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase">Protocol Escrow</p>
                            <p className="text-xs text-gray-700 break-all"><span className="font-semibold">Escrow PDA:</span> {createdRental.rentalEscrowPda}</p>
                            {createdRental.paymentVault && (
                                <p className="text-xs text-gray-700 break-all"><span className="font-semibold">Payment Vault:</span> {createdRental.paymentVault}</p>
                            )}
                            {createdRental.collateralVault && (
                                <p className="text-xs text-gray-700 break-all"><span className="font-semibold">Collateral Vault:</span> {createdRental.collateralVault}</p>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={onDone}
                        className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
             <div className="flex items-center justify-center space-x-1.5 text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>Secured by Verent Protocol</span>
             </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
