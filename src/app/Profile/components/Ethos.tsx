import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ethosOptions } from "@/lib/constants";
import { useEthos } from "@/contexts/ethos";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/ui/spinner"; // Add this component if you don't have it

// interface EthosProps {
//   onSelect: (ethos: string, isCustom: boolean, customText?: string) => void;
// }

const Ethos = () => {
  const { address } = useAccount();
  const { ethos: savedEthosFromContract, setEthos: setEthosOnContract, isLoading } = useEthos();
  
  // State for carousel control
  const [api, setApi] = useState<CarouselApi>();
  
  // Ethos state
  const [selectedEthos, setSelectedEthos] = useState<string | null>(null);
  const [customEthos, setCustomEthos] = useState<string>("");
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [savedEthos, setSavedEthos] = useState<string | null>(null);
  const [savedCustomEthos, setSavedCustomEthos] = useState<string>("");
  const [savedIsCustom, setSavedIsCustom] = useState(false);
  
  // Load saved ethos data from contract when component mounts
  useEffect(() => {
    if (savedEthosFromContract && address) {
      // Find if the ethos matches any predefined option
      const matchingOption = ethosOptions.find(option => 
        option.description.toLowerCase() === savedEthosFromContract.toLowerCase()
      );
      
      if (matchingOption) {
        // Use predefined ethos
        setSelectedEthos(matchingOption.title);
        setIsCustomSelected(false);
      } else if (savedEthosFromContract) {
        // Use as custom ethos
        setSelectedEthos("Custom");
        setIsCustomSelected(true);
        setCustomEthos(savedEthosFromContract);
      }
      
      // Store the saved values to compare for changes
      setSavedEthos(matchingOption ? matchingOption.title : "Custom");
      setSavedCustomEthos(matchingOption ? "" : savedEthosFromContract);
      setSavedIsCustom(!matchingOption);
    }
  }, [savedEthosFromContract, address]);
  
  // Scroll to the selected ethos when api is available
  useEffect(() => {
    if (!api || !selectedEthos) return;
    
    // Calculate the slide index
    let targetIndex: number;
    
    if (isCustomSelected) {
      targetIndex = ethosOptions.length; // Custom is the last slide
    } else {
      const foundIndex = ethosOptions.findIndex(option => option.title === selectedEthos);
      targetIndex = foundIndex !== -1 ? foundIndex : 0;
    }
    
    // Wait for the carousel to be ready
    const timeout = setTimeout(() => {
      api.scrollTo(targetIndex);
    }, 500); // Longer timeout to ensure the carousel is fully rendered
    
    return () => clearTimeout(timeout);
  }, [api, selectedEthos, isCustomSelected]);

  const handleSelect = (title: string) => {
    if (title === "Custom") {
      setIsCustomSelected(true);
      setSelectedEthos("Custom");
      if (api) api.scrollTo(ethosOptions.length);
    } else {
      setIsCustomSelected(false);
      setSelectedEthos(title);
      
      const index = ethosOptions.findIndex(option => option.title === title);
      if (index !== -1 && api) {
        api.scrollTo(index);
      }
    }
  };

  const handleCustomEthosChange = (text: string) => {
    setCustomEthos(text);
    
    if (!isCustomSelected) {
      setIsCustomSelected(true);
      setSelectedEthos("Custom");
      if (api) api.scrollTo(ethosOptions.length);
    }
  };

  // Update the confirmSelection function to prevent double transactions
  const confirmSelection = async () => {
    if (selectedEthos && !isLoading) {  // Add isLoading check to prevent multiple clicks
      try {
        // Determine the ethos text to save on-chain
        const ethosToSave = isCustomSelected ? customEthos : 
          ethosOptions.find(option => option.title === selectedEthos)?.description || '';

        // Call contract to save ethos
        await setEthosOnContract(ethosToSave);
        
        // Only update saved state variables if the transaction was successful
        setSavedEthos(selectedEthos);
        setSavedCustomEthos(customEthos);
        setSavedIsCustom(isCustomSelected);
        
        // Call the parent component's onSelect callback
        // onSelect(selectedEthos, isCustomSelected, isCustomSelected ? customEthos : undefined);
      } catch (error) {
        console.error('Error saving ethos:', error);
        // Don't update saved state variables if there was an error
      }
    }
  };
  
  // Determine if there are changes from what was saved
  const hasChanges = () => {
    if (!selectedEthos && !savedEthos) return false; 
    if (!savedEthos && selectedEthos) return true; 
    
    // Check if selection has changed from what was saved
    if (selectedEthos !== savedEthos) return true;
    
    // If custom is selected, check if the custom text has changed
    if (isCustomSelected && customEthos !== savedCustomEthos) return true;
    
    // If custom selection state has changed
    if (isCustomSelected !== savedIsCustom) return true;
    
    return false; // No changes detected
  };

  // Determine if apply button should be disabled
  const isApplyDisabled = () => {
    if (!selectedEthos) return true; // Nothing selected
    if (isCustomSelected && !customEthos.trim()) return true; // Custom selected but no text
    if (!hasChanges()) return true; // No changes made
    return false;
  };

  // Display loading state when needed
  if (isLoading && !selectedEthos) {
    return (
      <div className="w-full flex justify-center items-center p-12">
        <Spinner size="lg" />
        <span className="ml-3">Loading your ethos...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Ethos</h2>
      
      <Carousel 
        setApi={setApi} 
        className="w-full"
        opts={{
          align: "center",
          loop: false,
        }}
      >
        <CarouselContent>
          {ethosOptions.map((option, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <Card 
                className={cn(
                  "h-full flex flex-col cursor-pointer transition-colors duration-200",
                  selectedEthos === option.title ? "bg-primary/10" : ""
                )}
                onClick={() => handleSelect(option.title)}
              >
                <CardHeader>
                  <CardTitle className={cn(
                    selectedEthos === option.title ? "text-primary" : ""
                  )}>
                    {option.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm">{option.description}</p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
          
          {/* Custom option */}
          <CarouselItem className="md:basis-1/2 lg:basis-1/3">
            <Card 
              className={cn(
                "h-full flex flex-col cursor-pointer transition-colors duration-200",
                isCustomSelected ? "bg-primary/10" : ""
              )}
              onClick={() => handleSelect("Custom")}
            >
              <CardHeader>
                <CardTitle className={cn(
                  isCustomSelected ? "text-primary" : ""
                )}>
                  Custom
                </CardTitle>
                <CardDescription>Define your own ethos</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <Textarea
                  placeholder="Describe your custom ethos here..."
                  value={customEthos}
                  onChange={(e) => handleCustomEthosChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-full min-h-[150px]"
                />
              </CardContent>
            </Card>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      <div className="mt-8 flex justify-center">
        <Button 
          size="lg"
          variant={hasChanges() ? "default" : "outline"}
          onClick={confirmSelection}
          disabled={isApplyDisabled() || isLoading}
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2" size="sm" />
              Applying...
            </>
          ) : !selectedEthos ? (
            "Select a profile"
          ) : hasChanges() ? (
            "Apply"
          ) : (
            "Saved On-Chain"
          )}
        </Button>
      </div>
    </div>
  );
};

export default Ethos;