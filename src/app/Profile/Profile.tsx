import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount } from 'wagmi';
import Ethos from './components/Ethos';

function Profile() {
  const account = useAccount();
  // const { ethos, setEthos } = useEthos();

  // const handleEthosSelect = (selectedEthos: string, isCustom: boolean, customText?: string) => {
  //   // If it's a custom ethos, use the custom text
  //   // Otherwise use the selected ethos title as the ethos
  //   const newEthos = isCustom && customText ? customText : selectedEthos;

  //   setEthos(newEthos);
  //   toast("Ethos", {
  //     description: "Ethos updated successfully",
  //   });
  // };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <Card className="mx-4 lg:mx-6">
          <CardHeader>
            <CardTitle>Profile Info</CardTitle>
          </CardHeader>
          <CardContent>
            Address: {account.address}
            <br />
            Status: {account.status}
          </CardContent>
        </Card>

        <Card className="mx-4 lg:mx-6">
          <CardContent>
            <Ethos />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Profile;
