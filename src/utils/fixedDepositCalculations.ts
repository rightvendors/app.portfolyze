// Fixed Deposit calculation utilities
export interface FixedDepositCalculation {
  principal: number;
  interestRate: number;
  startDate: Date;
  currentDate: Date;
  maturityValue: number;
  interestEarned: number;
  daysInvested: number;
}

export const calculateFixedDepositValue = (
  principal: number,
  annualInterestRate: number,
  startDate: string | Date,
  currentDate: Date = new Date()
): FixedDepositCalculation => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const timeDiff = currentDate.getTime() - start.getTime();
  const daysInvested = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const yearsInvested = daysInvested / 365.25;
  
  // Compound interest calculation: A = P(1 + r/n)^(nt)
  // For quarterly compounding (n=4)
  const n = 4; // Quarterly compounding
  const maturityValue = principal * Math.pow(1 + (annualInterestRate / 100) / n, n * yearsInvested);
  const interestEarned = maturityValue - principal;
  
  return {
    principal,
    interestRate: annualInterestRate,
    startDate: start,
    currentDate,
    maturityValue,
    interestEarned,
    daysInvested
  };
};

export const calculateSimpleInterest = (
  principal: number,
  annualInterestRate: number,
  startDate: string | Date,
  currentDate: Date = new Date()
): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const timeDiff = currentDate.getTime() - start.getTime();
  const daysInvested = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const yearsInvested = daysInvested / 365.25;
  
  // Simple interest: SI = P * R * T / 100
  const simpleInterest = (principal * annualInterestRate * yearsInvested) / 100;
  return principal + simpleInterest;
}; 