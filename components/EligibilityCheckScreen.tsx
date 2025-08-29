

import React, { useState, useEffect, useMemo } from 'react';
import { JourneyStep, type ScreenProps } from '../types';
import Button from './common/Button';
import { CheckCircleIcon } from './common/Icons';
import { useAppContext } from '../App';

// Define options for the dropdowns
const courseFeeOptions = [
  { label: "Up to ₹5 Lakhs", value: "500000" },
  { label: "₹5 Lakhs - ₹10 Lakhs", value: "1000000" },
  { label: "₹10 Lakhs - ₹20 Lakhs", value: "2000000" },
  { label: "₹20 Lakhs - ₹40 Lakhs", value: "4000000" },
  { label: "₹40 Lakhs - ₹75 Lakhs", value: "7500000" },
  { label: "Above ₹75 Lakhs", value: "10000000" },
];

const parentIncomeOptions = [
  { label: "₹3 Lakhs - ₹5 Lakhs", value: "500000" },
  { label: "₹5 Lakhs - ₹10 Lakhs", value: "1000000" },
  { label: "₹10 Lakhs - ₹20 Lakhs", value: "2000000" },
  { label: "₹20 Lakhs - ₹50 Lakhs", value: "5000000" },
  { label: "Above ₹50 Lakhs", value: "5000001" },
];


const EligibilityCheckScreen: React.FC<ScreenProps> = ({ setJourneyStep, goBack }) => {
  const { appState, setEligibilityDetails, setEligibleAmount } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [notEligible, setNotEligible] = useState(false);
  const [details, setDetails] = useState(appState.eligibility);
  const [errors, setErrors] = useState<{ courseFee?: string, parentIncome?: string }>({});

  const validateField = (field: 'courseFee' | 'parentIncome', value: string) => {
    let errorMessage: string | undefined = undefined;

    if (!value) {
      errorMessage = "Please select an option.";
    }
    
    setErrors(prev => ({ ...prev, [field]: errorMessage }));
  };
  
  // Validate initial data from context
  useEffect(() => {
    if (details.courseFee) validateField('courseFee', String(details.courseFee));
    if (details.parentIncome) validateField('parentIncome', String(details.parentIncome));
  }, []); // Run only once on mount

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setDetails(prev => ({...prev, [id]: value }));
    if(id === 'courseFee' || id === 'parentIncome') {
        validateField(id, value);
    }
  };

  const handleCheck = () => {
    if (Object.values(errors).some(e => e) || !details.courseFee || !details.parentIncome) {
        if(!details.courseFee) validateField('courseFee', '');
        if(!details.parentIncome) validateField('parentIncome', '');
        return;
    }

    setIsLoading(true);
    setEligibilityDetails(details);
    
    setTimeout(() => {
      // More realistic eligibility calculation
      const income = Number(details.parentIncome) || 0;
      const fee = Number(details.courseFee) || 0;
      const tier = details.instituteTier || 'Tier 1';

      let multiplier = 2.0; // Base for Tier 3
      if (tier.includes('Tier 1')) multiplier = 4.5;
      if (tier.includes('Tier 2')) multiplier = 3.0;
      
      // Add a slight random factor to make the calculation feel more dynamic
      const randomFactor = (Math.random() - 0.5) * 0.1; // +/- 5%
      multiplier *= (1 + randomFactor);

      const incomeBasedAmount = income * multiplier;
      const feeBasedAmount = fee * 0.9; // Can cover up to 90% of fee
      
      const calculatedAmount = Math.min(incomeBasedAmount, feeBasedAmount);

      // Check if student is eligible at all
      if (calculatedAmount < fee * 0.5 || calculatedAmount < 100000) {
        setEligibleAmount(null);
        setNotEligible(true);
        setIsEligible(false);
      } else {
        const finalAmount = Math.floor(Math.min(calculatedAmount, 7500000) / 1000) * 1000; // Cap and round down to nearest 1000
        setEligibleAmount(finalAmount);
        setIsEligible(true);
        setNotEligible(false);
      }
      
      setIsLoading(false);
    }, 2500);
  };

  const isButtonDisabled = useMemo(() => {
    return isLoading || !details.courseFee || !details.parentIncome || !!errors.courseFee || !!errors.parentIncome;
  }, [isLoading, details, errors]);

  if (notEligible) {
    return (
      <div className="text-center flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800">We Need More Information</h2>
        <p className="text-gray-600 mt-2 mb-8">Based on the details provided, we are unable to pre-approve a loan at this time. This can happen for various reasons. We encourage you to contact our support team to discuss your application further.</p>
        <div className="w-full mt-8 flex items-center space-x-4">
            {goBack && <Button fullWidth variant="secondary" onClick={() => { setNotEligible(false); goBack && goBack(); }}>Go Back & Edit</Button>}
            <Button fullWidth onClick={() => alert("Contacting support...")}>Contact Support</Button>
        </div>
      </div>
    );
  }

  if (isEligible) {
    return (
      <div className="text-center flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <CheckCircleIcon className="w-24 h-24 text-scholarloan-secondary mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Great News!</h2>
        <p className="text-gray-600 mt-2 mb-8">You are pre-eligible for a loan. Let's find the best offers for you.</p>
        <p className="text-lg font-semibold text-gray-800">Eligible Amount: <span className="text-scholarloan-secondary">up to ₹{appState.eligibleAmount?.toLocaleString('en-IN')}</span></p>
        <div className="w-full bg-gray-200 rounded-full h-4 my-4 overflow-hidden">
          <div className="bg-scholarloan-secondary h-4 rounded-full" style={{width: `${((appState.eligibleAmount || 0)/7500000)*100}%`}}></div>
        </div>
        <Button fullWidth onClick={() => setJourneyStep(JourneyStep.OfferDiscovery)} className="mt-8">
          View Personalized Offers
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">Quick Eligibility Check</h2>
      <p className="text-gray-600 mt-2 mb-6">Let’s check how much we can support your journey. This won't affect your credit score.</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="courseFee" className="block text-sm font-medium text-gray-700">Total Course Fee</label>
          <select id="courseFee" value={details.courseFee || ''} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.courseFee ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-scholarloan-primary focus:border-scholarloan-primary sm:text-sm`}>
            <option value="" disabled>Select a range</option>
            {courseFeeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.courseFee && <p className="text-xs text-red-600 mt-1">{errors.courseFee}</p>}
        </div>
        <div>
          <label htmlFor="instituteTier" className="block text-sm font-medium text-gray-700">Institute Tier</label>
          <select id="instituteTier" value={details.instituteTier} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scholarloan-primary focus:border-scholarloan-primary sm:text-sm">
            <option>Tier 1 (IIT, IIM, ISB etc.)</option>
            <option>Tier 2</option>
            <option>Tier 3</option>
          </select>
        </div>
        <div>
          <label htmlFor="parentIncome" className="block text-sm font-medium text-gray-700">Parent's Annual Income</label>
           <select id="parentIncome" value={details.parentIncome || ''} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.parentIncome ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-scholarloan-primary focus:border-scholarloan-primary sm:text-sm`}>
             <option value="" disabled>Select a range</option>
            {parentIncomeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.parentIncome && <p className="text-xs text-red-600 mt-1">{errors.parentIncome}</p>}
        </div>
      </div>
      
      <div className="mt-8 flex items-center space-x-4">
        {goBack && <Button variant="secondary" onClick={goBack}>Back</Button>}
        <Button fullWidth onClick={handleCheck} disabled={isButtonDisabled}>
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking Eligibility...
            </div>
          ) : 'Check Eligibility'}
        </Button>
      </div>
    </div>
  );
};

export default EligibilityCheckScreen;