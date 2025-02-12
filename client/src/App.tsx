import React, { useState } from "react";
import './App.css';
import { PromptGenerator } from "./PromptGenerator";
import { Groups } from "./Groups";
import { Battle, Tournament } from "./Tournament";

function App() {
  const [bracket, setBracket] = useState<Battle[]>([]);
  const [showGroups, setShowGroups] = React.useState(false);
  const [step, setStep] = React.useState(1);

  return (
    <div className="App">
      <div className="step-flow">
        {step === 1 ? (
          showGroups ? (
            <Groups
              setBracket={setBracket}
              setShowGroups={setShowGroups}
              onProceed={() => setStep(2)}
            />
          ) : (
            <PromptGenerator
              onProceed={() => setStep(2)}
              setBracket={setBracket}
              setShowGroups={setShowGroups}
            />
          )
        ) : (
          // Step 2: Tournament bracket
          <Tournament bracket={bracket} setStep={setStep} />
        )}
      </div>
    </div>
  )
}

export default App
