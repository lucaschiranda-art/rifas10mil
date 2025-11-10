
import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
    return (
      <div key={interval} className="flex flex-col items-center justify-center bg-secondary text-white rounded-lg p-3 w-20 h-20 shadow-lg">
        <span className="text-3xl font-bold">{String(value).padStart(2, '0')}</span>
        <span className="text-xs uppercase">{interval}</span>
      </div>
    );
  });

  return (
    <div className="flex justify-center items-center space-x-2 md:space-x-4 my-6">
      {timerComponents.length ? timerComponents : <span className="text-xl text-gray-700">O sorteio já ocorreu!</span>}
    </div>
  );
};

export default CountdownTimer;