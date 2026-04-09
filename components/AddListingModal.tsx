
import React, { useRef, useState } from 'react';
import { X, Upload, Camera, Cpu, Plane, Zap, Loader2, CheckCircle2, DollarSign, MapPin, Plus } from 'lucide-react';
import { Listing } from '../types';
import type { CreateListingRequest } from '../shared/contracts';
import OnChainProofCard from './OnChainProofCard';

interface AddListingModalProps {
  onClose: () => void;
  onAdd: (payload: CreateListingRequest) => Promise<Listing>;
}

const AddListingModal: React.FC<AddListingModalProps> = ({ onClose, onAdd }) => {
  const [step, setStep] = useState<'details' | 'upload' | 'pricing' | 'processing' | 'success'>('details');
  const [formData, setFormData] = useState({
    title: '',
    category: 'Camera',
    productType: '',
    description: '',
    location: '',
    price: '',
    specs: ''
  });
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [createdListing, setCreatedListing] = useState<Listing | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only JPG, PNG, or WEBP images are supported.');
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('Image must be 10MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === 'string' ? reader.result : '');
      setImageName(file.name);
      setUploadError('');
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    setSubmitError('');
    const normalizedProductType = formData.productType.trim();
    if (formData.category === 'Other' && !normalizedProductType) {
      setSubmitError('Enter the product type for custom equipment.');
      return;
    }
    setStep('processing');
    void onAdd({
      title: formData.title,
      category: formData.category as CreateListingRequest['category'],
      productType: normalizedProductType || undefined,
      description: formData.description,
      location: formData.location,
      specs: formData.specs.split(',').map(s => s.trim()).filter(Boolean),
      dailyRateUsdc: parseFloat(formData.price) || 0,
      imageUrl: imageDataUrl || undefined
    }).then((listing) => {
      setCreatedListing(listing);
      setStep('success');
    }).catch((error) => {
      setSubmitError(error instanceof Error ? error.message : 'Failed to publish listing.');
      setStep('pricing');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-4 sm:px-6">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            
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
                    {createdListing && (
                      <div className="w-full max-w-xl mb-8 text-left">
                        <OnChainProofCard
                          signature={createdListing.confirmedSignature}
                          programId={createdListing.programId}
                          accountLabel="Listing PDA"
                          accountValue={createdListing.listingPda}
                          confirmedSlot={createdListing.confirmedSlot}
                          cluster={createdListing.chainCluster}
                          protocolVersion={createdListing.protocolVersion}
                        />
                      </div>
                    )}
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
                    <div className="mb-8 flex items-center space-x-3 sm:space-x-4">
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

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                                <option value="Audio">Audio / Speakers</option>
                                                <option value="Event">Event Gear</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <Plus className="w-4 h-4 rotate-45" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Product Type</label>
                                        <input
                                            type="text"
                                            name="productType"
                                            value={formData.productType}
                                            onChange={handleChange}
                                            placeholder={formData.category === 'Other' ? 'e.g. Stage Speaker, Mixer, Projector' : 'e.g. Cinema Camera, PA Speaker, LED Wall'}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all"
                                        />
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
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="group cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center transition-all hover:border-verent-green/50 hover:bg-gray-50 sm:p-12"
                            >
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-verent-green/10 transition-colors">
                                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-verent-green transition-colors" />
                                </div>
                                <h3 className="font-bold text-gray-900">Upload Photos</h3>
                                <p className="text-sm text-gray-500 mt-1">Drag & drop or click to browse</p>
                                <p className="text-xs text-gray-400 mt-4">Supported: JPG, PNG, WEBP (Max 10MB)</p>
                            </div>
                            {imageDataUrl && (
                              <div className="rounded-xl border border-gray-200 p-3 bg-white">
                                <img src={imageDataUrl} alt="Listing preview" className="w-full max-h-72 object-contain rounded-lg bg-gray-50" />
                                <p className="text-xs text-gray-500 mt-2">{imageName}</p>
                              </div>
                            )}
                            {uploadError && (
                              <p className="text-sm text-red-600">{uploadError}</p>
                            )}
                            
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
                                <p className="text-xs text-gray-500 mt-2">Suggested rate varies by category and product type. Use the exact gear type for better pricing accuracy.</p>
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
                            {submitError && (
                              <p className="text-sm text-red-600">{submitError}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Footer Actions */}
        {(step === 'details' || step === 'upload' || step === 'pricing') && (
            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <button 
                    onClick={() => {
                        if (step === 'details') onClose();
                        if (step === 'upload') setStep('details');
                        if (step === 'pricing') setStep('upload');
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
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
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-black px-8 py-3 text-sm font-bold text-white shadow-lg shadow-gray-200 transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2.5"
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
