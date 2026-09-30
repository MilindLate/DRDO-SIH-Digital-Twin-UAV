import React from 'react';
import Page05_FaultDiagnosis from './Page05_FaultDiagnosis';
import Page07_RULDegradation from './Page07_RULDegradation';

export default function Page05_FaultsAndRUL() {
  return (
    <div className="flex h-full w-full gap-2 p-2 bg-bg overflow-hidden">
      <div className="w-1/2 h-full flex flex-col min-w-0">
        <Page05_FaultDiagnosis  />
      </div>
      <div className="w-1/2 h-full flex flex-col min-w-0">
        <Page07_RULDegradation  />
      </div>
    </div>
  );
}
