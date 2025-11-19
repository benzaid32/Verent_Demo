
import React, { useState } from 'react';
import { X, Upload, Camera, Cpu, Plane, Zap, Loader2, CheckCircle2, DollarSign, MapPin, Plus } from 'lucide-react';
import { Listing, DeviceType } from '../types';
import { MOCK_USER } from '../constants';

interface AddListingModalProps {
  onClose: () => void;
  onAdd: (listing: Listing) => void;
}

const AddListingModal: React.FC<AddListingModalProps> = ({ onClose, onAdd }) => {
  const [step, setStep] = useState<'details' | 'upload' | 'pricing' | 'processing' | 'success'>('details');
  const [formData, setFormData] = useState({
    title: '',
    category: 'Camera',
    description: '',
    location: '',
    price: '',
    specs: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    setStep('processing');
    
    // Simulate API/Blockchain delay
    setTimeout(() => {
      const newListing: Listing = {
        id: `lst_${Date.now()}`,
        title: formData.title,
        category: formData.category as any,
        description: formData.description,
        specs: formData.specs.split(',').map(s => s.trim()).filter(s => s),
        dailyRateUsdc: parseFloat(formData.price) || 0,
        collateralValueUsdc: (parseFloat(formData.price) || 0) * 50, // Mock calculation: 50x daily rate
        location: formData.location,
        ownerId: MOCK_USER.id,
        ownerName: 'You',
        ownerAvatar: `https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop`,
        imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop', // Placeholder for demo
        availability: 'active'
      };
      
      onAdd(newListing);
      setStep('success');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">List New Equipment</h2>
            <p className="text-xs text-gray-500">Add hardware to the Verent network</p>
          </div>
          {step !== 'processing' && step !== 'success' && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
            
            {/* SUCCESS STATE */}
            {step === 'success' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Listing Live!</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mb-8">
                        Your <strong>{formData.title}</strong> has been minted as an asset on Solana and is now available for rent.
                    </p>
                    <button 
                        onClick={onClose}
                        className="bg-black text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 transition-all"
                    >
                        Return to Dashboard
                    </button>
                </div>
            )}

            {/* PROCESSING STATE */}
            {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-gray-100 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-verent-green rounded-full border-t-transparent absolute top-0 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-verent-green animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Publishing to Network</h3>
                        <p className="text-sm text-gray-500 mt-1">Uploading metadata to IPFS & verifying specs...</p>
                    </div>
                </div>
            )}

            {/* FORM STEPS */}
            {(step === 'details' || step === 'upload' || step === 'pricing') && (
                <div className="space-y-8">
                    
                    {/* Step Progress */}
                    <div className="flex items-center space-x-4 mb-8">
                        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'details' || step === 'upload' || step === 'pricing' ? 'bg-verent-green' : 'bg-gray-100'}`}></div>
                        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'upload' || step === 'pricing' ? 'bg-verent-green' : 'bg-gray-100'}`}></div>
                        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'pricing' ? 'bg-verent-green' : 'bg-gray-100'}`}></div>
                    </div>

                    {step === 'details' && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Equipment Title</label>
                                    <input 
                                        type="text" 
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="e.g. RED Komodo 6K Cinema Camera" 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category</label>
                                        <div className="relative">
                                            <select 
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all"
                                            >
                                                <option value="Camera">Camera</option>
                                                <option value="Drone">Drone</option>
                                                <option value="Compute">Compute (GPU)</option>
                                                <option value="Lighting">Lighting</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <Plus className="w-4 h-4 rotate-45" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input 
                                                type="text" 
                                                name="location"
                                                value={formData.location}
                                                onChange={handleChange}
                                                placeholder="City, State" 
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description</label>
                                    <textarea 
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Describe the condition, included accessories, and any specific usage instructions..." 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all resize-none"
                                    />
                                </div>

                                 <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Key Specs (comma separated)</label>
                                    <input 
                                        type="text" 
                                        name="specs"
                                        value={formData.specs}
                                        onChange={handleChange}
                                        placeholder="e.g. 4K 120fps, RF Mount, 2TB SSD" 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'upload' && (
                         <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:bg-gray-50 hover:border-verent-green/50 transition-all cursor-pointer group">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-verent-green/10 transition-colors">
                                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-verent-green transition-colors" />
                                </div>
                                <h3 className="font-bold text-gray-900">Upload Photos</h3>
                                <p className="text-sm text-gray-500 mt-1">Drag & drop or click to browse</p>
                                <p className="text-xs text-gray-400 mt-4">Supported: JPG, PNG, WEBP (Max 10MB)</p>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3">
                                <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-800 leading-relaxed">
                                    <strong>AI Verification:</strong> Uploaded images are automatically analyzed to verify the make, model, and condition of your hardware.
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'pricing' && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                             <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Daily Rental Rate (USDC)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-900" />
                                    <input 
                                        type="number" 
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="0.00" 
                                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-2xl font-mono font-bold text-gray-900 focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Suggested rate for similar items: $120 - $150 / day</p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Listing Fee</span>
                                    <span className="font-medium text-gray-900">Free</span>
                                </div>
                                 <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Commission (on rent)</span>
                                    <span className="font-medium text-gray-900">5%</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-bold">
                                    <span className="text-gray-900">You Earn</span>
                                    <span className="text-verent-green">95% of rental price</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Footer Actions */}
        {(step === 'details' || step === 'upload' || step === 'pricing') && (
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between">
                <button 
                    onClick={() => {
                        if (step === 'details') onClose();
                        if (step === 'upload') setStep('details');
                        if (step === 'pricing') setStep('upload');
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                    {step === 'details' ? 'Cancel' : 'Back'}
                </button>
                
                <button 
                    onClick={() => {
                        if (step === 'details') setStep('upload');
                        if (step === 'upload') setStep('pricing');
                        if (step === 'pricing') handleSubmit();
                    }}
                    disabled={step === 'details' && !formData.title}
                    className="bg-black text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                    <span>{step === 'pricing' ? 'Publish Listing' : 'Continue'}</span>
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AddListingModal;
