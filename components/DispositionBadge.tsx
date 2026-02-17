import React from 'react';
import { Disposition } from '../types';

interface Props {
  disposition: Disposition;
}

const DispositionBadge: React.FC<Props> = ({ disposition }) => {
  const getColors = () => {
    switch (disposition) {
      case Disposition.SALE:
        return 'bg-green-100 text-green-800 border-green-200 shadow-sm';
      case Disposition.CALLBK:
        return 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm';
      case Disposition.CNP:
        return 'bg-sky-100 text-sky-800 border-sky-200 shadow-sm';
      case Disposition.NI:
      case Disposition.DNC:
        return 'bg-red-100 text-red-800 border-red-200 shadow-sm';
      case Disposition.CC:
      case Disposition.LB:
        return 'bg-orange-100 text-orange-800 border-orange-200 shadow-sm';
      case Disposition.DNQ:
        return 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm';
      case Disposition.TS:
        return 'bg-purple-100 text-purple-800 border-purple-200 shadow-sm';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 shadow-sm';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-md text-sm font-bold border uppercase tracking-widest ${getColors()}`}>
      {disposition}
    </span>
  );
};

export default DispositionBadge;