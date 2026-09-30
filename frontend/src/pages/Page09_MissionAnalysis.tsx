import React from 'react';
import Page09_MissionReplay from './Page09_MissionReplay';
import Page10_PostFlightAnalysis from './Page10_PostFlightAnalysis';

export default function Page09_MissionAnalysis() {
  return (
    <div className="flex flex-col h-full w-full gap-2 p-2 bg-bg overflow-hidden">
      <div className="h-1/2 w-full flex flex-col min-h-0">
        <Page09_MissionReplay  />
      </div>
      <div className="h-1/2 w-full flex flex-col min-h-0">
        <Page10_PostFlightAnalysis  />
      </div>
    </div>
  );
}
