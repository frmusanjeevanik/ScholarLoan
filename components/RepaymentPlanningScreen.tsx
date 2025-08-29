
import React, { useState, useMemo, useEffect } from 'react';
import { JourneyStep, type ScreenProps } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { useAppContext } from '../App';

interface PaymentPlan {
  id: 'balanced' | 'saver' | 'flexible';
  name: string;
  description: string;
  emi: number;
  totalInterest: number;
  totalMonths: number;
}

const RepaymentPlanningScreen: React.FC<ScreenProps> = ({ setJourneyStep, goBack }) => {
  const { appState } = useAppContext();
  const loanAmount = appState.selectedOffer?.amount ?? 4000000;
  const rate = parseFloat(appState.selectedOffer?.interestRate ?? "8.5");
  
  const tenureOptions = [5, 7, 10, 12, 15];
  const initialTenureFromOffer = appState.selectedOffer?.tenure;
  const defaultTenure = 10;
  const initialTenure = initialTenureFromOffer && tenureOptions.includes(initialTenureFromOffer) 
    ? initialTenureFromOffer 
    : defaultTenure;

  const [tenure, setTenure] = useState(initialTenure);
  const [selectedPlanId, setSelectedPlanId] = useState<PaymentPlan['id']>('balanced');
  const [displayEmi, setDisplayEmi] = useState(0);
  
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('');
  const [oneTimePrepayment, setOneTimePrepayment] = useState('');

  const paymentPlans: PaymentPlan[] = useMemo(() => {
    const principal = loanAmount;
    const monthlyRate = rate / (12 * 100);
    const originalMonths = tenure * 12;
    if (principal <= 0 || monthlyRate <= 0 || originalMonths <= 0) return [];
    
    // 1. Balanced Plan (Standard EMI)
    const balancedEmi = Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, originalMonths)) / (Math.pow(1 + monthlyRate, originalMonths) - 1));
    const balancedTotalInterest = Math.round((balancedEmi * originalMonths) - principal);

    // 2. Saver Plan (Accelerated Payment)
    const saverEmi = Math.round(balancedEmi * 1.15);
    const saverMonths = -Math.log(1 - (principal * monthlyRate) / saverEmi) / Math.log(1 + monthlyRate);
    const saverTotalInterest = Math.round((saverEmi * saverMonths) - principal);

    // 3. Flexible Plan (Lower Payment) - Be cautious, might extend tenure significantly
    const flexibleEmi = Math.round(balancedEmi * 0.90);
    const flexibleMonths = -Math.log(1 - (principal * monthlyRate) / flexibleEmi) / Math.log(1 + monthlyRate);
    const flexibleTotalInterest = isFinite(flexibleMonths) ? Math.round((flexibleEmi * flexibleMonths) - principal) : Infinity;
    
    return [
      { id: 'balanced', name: 'Balanced Plan', description: 'Standard EMI for a steady repayment.', emi: balancedEmi, totalInterest: balancedTotalInterest, totalMonths: originalMonths },
      { id: 'saver', name: 'Saver Plan', description: 'Pay more monthly to save on total interest.', emi: saverEmi, totalInterest: saverTotalInterest, totalMonths: Math.ceil(saverMonths) },
      { id: 'flexible', name: 'Flexible Plan', description: 'Lower EMI for more monthly flexibility.', emi: flexibleEmi, totalInterest: flexibleTotalInterest, totalMonths: Math.ceil(flexibleMonths) },
    ];
  }, [loanAmount, rate, tenure]);

  const simulationResult = useMemo(() => {
      const selectedPlan = paymentPlans.find(p => p.id === selectedPlanId);
      if (!selectedPlan) return null;

      const oneTimeNum = parseFloat(oneTimePrepayment) || 0;
      const extraMonthlyNum = parseFloat(extraMonthlyPayment) || 0;

      if (oneTimeNum === 0 && extraMonthlyNum === 0) return null;

      const principal = loanAmount - oneTimeNum;
      if (principal <= 0) {
        return { newTenure: "Paid Off!", interestSaved: selectedPlan.totalInterest };
      }
      
      const effectiveEmi = selectedPlan.emi + extraMonthlyNum;
      const monthlyRate = rate / (12 * 100);
      
      if (effectiveEmi <= principal * monthlyRate) {
          return { newTenure: "Never Paid Off", interestSaved: -Infinity };
      }

      const newMonths = -Math.log(1 - (principal * monthlyRate) / effectiveEmi) / Math.log(1 + monthlyRate);
      const newTotalPaid = (newMonths * effectiveEmi) + oneTimeNum;
      const newTotalInterest = newTotalPaid - loanAmount;
      const interestSaved = Math.round(selectedPlan.totalInterest - newTotalInterest);
      
      const years = Math.floor(newMonths / 12);
      const months = Math.ceil(newMonths % 12);

      return {
          newTenure: `${years} years, ${months} months`,
          interestSaved,
      };
  }, [paymentPlans, selectedPlanId, extraMonthlyPayment, oneTimePrepayment, loanAmount, rate]);

  useEffect(() => {
    const selectedPlan = paymentPlans.find(p => p.id === selectedPlanId);
    if (selectedPlan) {
      setDisplayEmi(selectedPlan.emi);
    } else if (paymentPlans.length > 0) {
      // Fallback to balanced if selected plan disappears
      setDisplayEmi(paymentPlans[0].emi);
      setSelectedPlanId('balanced');
    }
  }, [selectedPlanId, paymentPlans]);

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">Plan Your Repayment</h2>
      <p className="text-gray-600 mt-2 mb-6">You're in control. Let's find a plan that works for you.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: EMI Calculator & Options */}
        <div className="space-y-6">
            <Card>
              <div className="text-center">
                  <p className="text-sm text-gray-500">Your Monthly EMI</p>
                  <p className="text-4xl font-bold text-scholarloan-primary my-2">₹{displayEmi.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="mt-6">
                <label htmlFor="tenure" className="block text-sm font-medium text-gray-700">Repayment Tenure</label>
                <select id="tenure" value={tenure} onChange={(e) => setTenure(parseInt(e.target.value, 10))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scholarloan-primary focus:border-scholarloan-primary sm:text-sm">
                    {tenureOptions.map(option => (<option key={option} value={option}>{option} years</option>))}
                </select>
              </div>
            </Card>

            <div>
                <h3 className="font-semibold text-gray-700 mb-2">Choose Your Payment Plan</h3>
                <div className="space-y-3">
                    {paymentPlans.map(plan => (
                        <div key={plan.id} onClick={() => setSelectedPlanId(plan.id)}
                           className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? 'border-scholarloan-primary bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                           <div className="flex justify-between items-center">
                                <h4 className="font-bold">{plan.name}</h4>
                                {plan.id === 'balanced' && (
                                    <span className="text-xs font-semibold bg-amber-100 text-scholarloan-secondary px-2 py-0.5 rounded-full">Recommended</span>
                                )}
                           </div>
                           <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                           <div className="flex justify-between items-end mt-2">
                                <p className="text-lg font-semibold text-gray-800">₹{plan.emi.toLocaleString('en-IN')}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                                <div>
                                    <p className="text-xs text-gray-500 text-right">Total Interest</p>
                                    <p className="text-sm font-medium text-gray-600">₹{isFinite(plan.totalInterest) ? plan.totalInterest.toLocaleString('en-IN') : 'N/A'}</p>
                                </div>
                           </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
        
        {/* Right: Info Boxes & Simulator */}
        <div className="space-y-6">
            <Card>
                <h4 className="font-bold text-gray-800">Prepayment Simulator</h4>
                <p className="text-xs text-gray-500 mt-1 mb-4">See how extra payments can accelerate your loan freedom.</p>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="oneTimePrepayment" className="block text-xs font-medium text-gray-700">One-Time Prepayment (Today)</label>
                        <input type="number" id="oneTimePrepayment" value={oneTimePrepayment} onChange={e => setOneTimePrepayment(e.target.value)} placeholder="e.g., 50000" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scholarloan-primary focus:border-scholarloan-primary sm:text-sm"/>
                    </div>
                     <div>
                        <label htmlFor="extraMonthlyPayment" className="block text-xs font-medium text-gray-700">Extra Monthly Payment</label>
                        <input type="number" id="extraMonthlyPayment" value={extraMonthlyPayment} onChange={e => setExtraMonthlyPayment(e.target.value)} placeholder="e.g., 5000" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scholarloan-primary focus:border-scholarloan-primary sm:text-sm"/>
                    </div>
                </div>
                {simulationResult && (
                    <div className="mt-4 pt-4 border-t border-dashed">
                        <div className="bg-amber-50 p-3 rounded-lg text-center">
                            <p className="text-sm font-semibold text-amber-800">Potential Savings</p>
                            <div className="flex justify-around mt-2">
                                <div>
                                    <p className="text-xs text-gray-500">New Tenure</p>
                                    <p className="font-bold text-scholarloan-primary">{simulationResult.newTenure}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Interest Saved</p>
                                    <p className="font-bold text-scholarloan-primary">₹{simulationResult.interestSaved.toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-scholarloan-secondary">
                <h4 className="font-bold text-amber-800">Accelerate Your Financial Freedom</h4>
                <p className="text-sm text-amber-700 mt-2">Thinking of paying off your loan early? We encourage it! There are absolutely <strong>no prepayment penalties</strong>.</p>
                <ul className="list-disc list-inside text-sm text-amber-700 mt-2 space-y-1">
                <li><strong>Save on Interest:</strong> Paying more than your EMI reduces the principal, saving you significant interest over time.</li>
                <li><strong>Become Debt-Free Sooner:</strong> Clear your loan ahead of schedule and focus on your next big goal.</li>
                </ul>
            </div>
        </div>
      </div>
      
      <div className="mt-8 flex items-center space-x-4">
        {goBack && <Button variant="secondary" onClick={goBack}>Back</Button>}
        <Button fullWidth onClick={() => setJourneyStep(JourneyStep.Dashboard)}>
          Go to My Dashboard
        </Button>
      </div>
    </div>
  );
};

export default RepaymentPlanningScreen;
